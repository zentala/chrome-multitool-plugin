import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Anthropic } from "@anthropic-ai/sdk";
import { BookmarkEntity } from '../types/bookmarks.types';

interface StoredEmbedding {
  id: string;
  embedding: number[];
  pageContent: string;
  metadata: {
    bookmarkId: string;
    title: string;
    url: string;
    folderPath?: string;
    description?: string;
    tags?: string[];
    lastModified?: number;
    [key: string]: any;
  };
  lastUpdated: number;
}

interface SearchDocument {
  pageContent: string;
  metadata: {
    bookmarkId: string;
    title: string;
    url: string;
    folderPath?: string;
    description?: string;
    tags?: string[];
    lastModified?: number;
    [key: string]: any;
  };
}

interface KeywordSearchResult {
  doc: SearchDocument;
  keywordScore: number;
  titleScore: number;
  urlScore: number;
  contentScore: number;
  vectorScore?: number;
}

class VectorStoreService {
  private static readonly DB_NAME = 'bookmarks_vectorstore';
  private static readonly STORE_NAME = 'embeddings';
  private static readonly CHUNK_SIZE = 10;
  private static readonly TEST_MODE_LIMIT = 5;
  private isDebugMode: boolean = false;

  private db: IDBDatabase | null = null;
  private vectorStore: MemoryVectorStore | null = null;
  private embeddings: any = null;
  private anthropicClient: Anthropic | null = null;
  private provider: 'openai' | 'anthropic' = 'openai';
  private currentApiKey: string = '';
  private confirmCallback: ((bookmarks: BookmarkEntity[]) => Promise<boolean>) | null = null;
  private documents: Array<{
    pageContent: string;
    metadata: {
      bookmarkId: string;
      title: string;
      url: string;
      folderPath?: string;
      description?: string;
      tags?: string[];
      lastModified?: number;
      [key: string]: any;
    };
  }> = [];

  setConfirmCallback(callback: (bookmarks: BookmarkEntity[]) => Promise<boolean>) {
    this.confirmCallback = callback;
  }

  private async initDB() {
    return new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(VectorStoreService.DB_NAME, 1);
      
      request.onerror = () => {
        console.error('Błąd podczas otwierania bazy:', request.error);
        reject(request.error);
      };
      
      request.onsuccess = () => {
        console.log('Baza danych otwarta pomyślnie');
        resolve(request.result);
      };
      
      request.onupgradeneeded = (event) => {
        console.log('Aktualizacja struktury bazy danych');
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(VectorStoreService.STORE_NAME)) {
          db.createObjectStore(VectorStoreService.STORE_NAME, { keyPath: 'id' });
        }
      };
    });
  }

  private async loadStoredEmbeddings(): Promise<StoredEmbedding[]> {
    if (!this.db) {
      console.log('Inicjalizacja bazy danych...');
      this.db = await this.initDB();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([VectorStoreService.STORE_NAME], 'readonly');
      const store = transaction.objectStore(VectorStoreService.STORE_NAME);
      const request = store.getAll();

      request.onerror = () => {
        console.error('Błąd podczas ładowania embeddingów:', request.error);
        reject(request.error);
      };
      
      request.onsuccess = () => {
        console.log(`Załadowano ${request.result.length} embeddingów`);
        resolve(request.result);
      };
    });
  }

  private async saveEmbeddings(embeddings: StoredEmbedding[]) {
    if (!this.db) {
      console.log('Inicjalizacja bazy danych przed zapisem...');
      this.db = await this.initDB();
    }

    return new Promise<void>((resolve, reject) => {
      const transaction = this.db!.transaction([VectorStoreService.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(VectorStoreService.STORE_NAME);

      transaction.onerror = () => {
        console.error('Błąd transakcji:', transaction.error);
        reject(transaction.error);
      };

      transaction.oncomplete = () => {
        console.log(`Zapisano ${embeddings.length} embeddingów`);
        resolve();
      };

      // Wyczyść stare dane
      store.clear().onsuccess = () => {
        console.log('Wyczyszczono stare embeddingi');
        
        // Zapisz nowe dane
        embeddings.forEach(embedding => {
          try {
            store.add(embedding);
          } catch (error) {
            console.error('Błąd podczas dodawania embeddingu:', error);
          }
        });
      };
    });
  }

  async initialize(apiKey: string, provider: 'openai' | 'anthropic') {
    if (this.vectorStore && this.embeddings) {
        console.log('VectorStore już zainicjalizowany, pomijam inicjalizację');
        return true;
    }

    console.log('Rozpoczynam inicjalizację VectorStore...');
    this.provider = provider;
    this.currentApiKey = apiKey;

    try {
        if (!this.db) {
            console.log('Inicjalizacja bazy danych...');
            this.db = await this.initDB();
        }

        // Sprawdź stan bazy przed inicjalizacją
        const stats = await this.getDatabaseStats();
        console.log('Stan bazy przed inicjalizacją:', stats);

        const storedEmbeddings = await this.loadStoredEmbeddings();
        console.log(`Znaleziono ${storedEmbeddings.length} zapisanych embeddingów w bazie`);
        
        if (storedEmbeddings.length > 0) {
            console.log('Przykładowy embedding:', {
                id: storedEmbeddings[0].id,
                hasEmbedding: !!storedEmbeddings[0].embedding,
                embeddingLength: storedEmbeddings[0].embedding?.length || 0,
                metadata: storedEmbeddings[0].metadata
            });
        }

        // Inicjalizujemy embeddings service tylko jeśli nie jest już zainicjalizowany
        if (!this.embeddings) {
            this.embeddings = {
                embedQuery: async (text: string): Promise<number[]> => {
                    if (provider === 'openai') {
                        if (!this.embeddings) {
                            this.embeddings = new OpenAIEmbeddings({
                                openAIApiKey: apiKey,
                                modelName: "text-embedding-3-small"
                            });
                        }
                        return this.embeddings.embedQuery(text);
                    } else {
                        if (!this.anthropicClient) {
                            this.anthropicClient = new Anthropic({
                                apiKey: apiKey,
                                dangerouslyAllowBrowser: true
                            });
                        }
                        return Array(1024).fill(0).map(() => Math.random());
                    }
                },
                embedDocuments: async (documents: string[]): Promise<number[][]> => {
                    if (provider === 'openai') {
                        if (!this.embeddings) {
                            this.embeddings = new OpenAIEmbeddings({
                                openAIApiKey: apiKey,
                                modelName: "text-embedding-3-small"
                            });
                        }
                        return this.embeddings.embedDocuments(documents);
                    } else {
                        if (!this.anthropicClient) {
                            this.anthropicClient = new Anthropic({
                                apiKey: apiKey,
                                dangerouslyAllowBrowser: true
                            });
                        }
                        return documents.map(() => 
                            Array(1024).fill(0).map(() => Math.random())
                        );
                    }
                }
            };
        }

        // Inicjalizujemy VectorStore z zapisanymi embeddingami
        if (!this.vectorStore) {
            if (storedEmbeddings.length > 0) {
                console.log('Inicjalizacja VectorStore z zapisanymi embeddingami...');
                const documents = storedEmbeddings.map(e => ({
                    pageContent: e.pageContent,
                    metadata: e.metadata,
                    embedding: e.embedding
                }));

                this.vectorStore = await MemoryVectorStore.fromTexts(
                    documents.map(d => d.pageContent),
                    documents.map(d => d.metadata),
                    this.embeddings
                );

                // Zachowaj dokumenty do późniejszego użycia
                this.documents = documents;
                console.log(`VectorStore zainicjalizowany z ${documents.length} dokumentami`);
            } else {
                console.log('Inicjalizacja pustego VectorStore...');
                this.vectorStore = await MemoryVectorStore.fromTexts(
                    [],
                    [],
                    this.embeddings
                );
            }
        }

        console.log('VectorStore zainicjalizowany pomyślnie');
        return true;
    } catch (error) {
        console.error('Błąd podczas inicjalizacji VectorStore:', error);
        return false;
    }
  }

  private flattenBookmarks(bookmarks: BookmarkEntity[]): BookmarkEntity[] {
    const flattened: BookmarkEntity[] = [];
    const folderPaths: string[] = [];
    let processedCount = 0;

    const traverse = (nodes: BookmarkEntity[], parentPath: string = ''): boolean => {
      for (const node of nodes) {
        if (this.isDebugMode && processedCount >= VectorStoreService.TEST_MODE_LIMIT) {
          return false; // Przerwij przetwarzanie w trybie debug
        }

        if (!node.url) {
          // To jest folder
          const folderPath = parentPath ? `${parentPath}/${node.title}` : node.title;
          console.log('Znaleziono folder:', folderPath);
          if (node.children && node.children.length > 0) {
            console.log(`Zawartość folderu ${folderPath}:`, node.children.map(c => c.title));
            folderPaths.push(folderPath);
            if (!traverse(node.children, folderPath)) {
              return false;
            }
          }
        } else {
          // To jest zakładka
          console.log(`Zakładka w ${parentPath}:`, node.title);
          const bookmarkWithMetadata = {
            ...node,
            metadata: {
              ...node.metadata,
              folderPath: parentPath,
              lastModified: node.extended?.lastModified || Date.now()
            }
          };
          flattened.push(bookmarkWithMetadata);
          processedCount++;
          
          if (this.isDebugMode && processedCount >= VectorStoreService.TEST_MODE_LIMIT) {
            return false;
          }
        }
      }
      return true;
    };

    console.log('Rozpoczynam spłaszczanie zakładek...');
    traverse(bookmarks);
    console.log('Znalezione ścieżki folderów:', folderPaths);
    console.log(`Spłaszczono ${flattened.length} zakładek`);

    if (this.isDebugMode) {
      console.log(`TRYB DEBUG: Ograniczono do ${VectorStoreService.TEST_MODE_LIMIT} zakładek:`, 
        flattened.slice(0, VectorStoreService.TEST_MODE_LIMIT).map(b => b.title)
      );
      return flattened.slice(0, VectorStoreService.TEST_MODE_LIMIT);
    }

    return flattened;
  }

  private normalizeContent(content: string): string {
    // Usuń nadmiarowe spacje i ujednolicaj wcięcia
    return content
      .split('\n')
      .map(line => line.trim())
      .join('\n')
      .trim()
      .toLowerCase(); // Dodajemy konwersję na małe litery
  }

  private compareLastModified(date1: number | undefined, date2: number | undefined): boolean {
    if (!date1 || !date2) {
      console.log('Brak daty lastModified:', { date1, date2 });
      return true;
    }
    // Konwertuj do liczb i porównaj tylko datę (bez milisekund)
    const d1 = Math.floor(Number(date1) / 1000);
    const d2 = Math.floor(Number(date2) / 1000);
    console.log('Porównanie lastModified:', {
      original1: date1,
      original2: date2,
      converted1: d1,
      converted2: d2,
      areEqual: d1 === d2
    });
    return d1 === d2;
  }

  async addBookmarks(bookmarks: BookmarkEntity[]) {
    if (!this.vectorStore || !this.embeddings) {
      console.error('Baza wektorowa nie jest zainicjalizowana!');
      return;
    }

    // Spłaszczamy drzewo zakładek
    const flattenedBookmarks = this.flattenBookmarks(bookmarks);
    console.log(`Znaleziono ${flattenedBookmarks.length} zakładek do przetworzenia`);

    // Załaduj istniejące embeddingi
    const storedEmbeddings = await this.loadStoredEmbeddings();
    console.log(`Załadowano ${storedEmbeddings.length} istniejących embeddingów z bazy`);

    const embeddingsToGenerate: Array<{
      bookmark: BookmarkEntity,
      pageContent: string,
      metadata: any
    }> = [];

    // Sprawdź które zakładki wymagają nowych embeddingów
    for (const bookmark of flattenedBookmarks) {
      const folderPath = bookmark.metadata?.folderPath || '';
      const pageContent = this.normalizeContent(`
        Tytuł: ${bookmark.title}
        URL: ${bookmark.url}
        Ścieżka folderu: ${folderPath}
        Opis: ${bookmark.extended?.description || ''}
        Tagi: ${bookmark.extended?.tags?.join(', ') || ''}
        Słowa kluczowe URL: ${this.extractKeywordsFromUrl(bookmark.url)}
        Słowa kluczowe tytułu: ${this.extractKeywordsFromText(bookmark.title)}
      `);

      const documentMetadata = {
        bookmarkId: bookmark.id,
        title: bookmark.title,
        url: bookmark.url,
        folderPath,
        description: bookmark.extended?.description,
        tags: bookmark.extended?.tags,
        lastModified: bookmark.metadata?.lastModified || Date.now()
      };

      const existingEmbedding = storedEmbeddings.find(e => e.metadata.bookmarkId === bookmark.id);
      
      if (existingEmbedding) {
        console.log(`\nSprawdzanie zakładki "${bookmark.title}" (ID: ${bookmark.id}):`);
        const normalizedExistingContent = this.normalizeContent(existingEmbedding.pageContent);
        
        console.log('Istniejący embedding:', {
          lastModified: existingEmbedding.metadata.lastModified,
          pageContent: normalizedExistingContent
        });
        console.log('Nowe dane:', {
          lastModified: documentMetadata.lastModified,
          pageContent: pageContent
        });

        const contentChanged = normalizedExistingContent !== pageContent;
        const noEmbedding = !existingEmbedding.embedding || existingEmbedding.embedding.length === 0;

        // Sprawdzamy lastModified tylko jeśli treść się zmieniła
        const lastModifiedChanged = contentChanged && !this.compareLastModified(
          existingEmbedding.metadata.lastModified,
          documentMetadata.lastModified
        );

        if (contentChanged) {
          console.log('Różnice w zawartości po normalizacji:');
          console.log('Stara:', normalizedExistingContent);
          console.log('Nowa:', pageContent);
        }

        // Aktualizujemy tylko gdy treść się zmieniła lub brakuje embeddingu
        const needsUpdate = contentChanged || noEmbedding;

        if (needsUpdate) {
          console.log(`[${bookmark.id}] Zakładka "${bookmark.title}" wymaga aktualizacji embeddingu:`, {
            lastModifiedChanged,
            contentChanged,
            noEmbedding,
            oldLastModified: existingEmbedding.metadata.lastModified,
            newLastModified: documentMetadata.lastModified
          });
          embeddingsToGenerate.push({
            bookmark,
            pageContent,
            metadata: documentMetadata
          });
        } else {
          console.log(`[${bookmark.id}] Używam istniejącego embeddingu dla zakładki: ${bookmark.title}`);
        }
      } else {
        console.log(`[${bookmark.id}] Nowa zakładka "${bookmark.title}" - generuję embedding`);
        embeddingsToGenerate.push({
          bookmark,
          pageContent,
          metadata: documentMetadata
        });
      }
    }

    // Generuj nowe embeddingi tylko jeśli są potrzebne i użytkownik potwierdził
    if (embeddingsToGenerate.length > 0) {
      if (this.confirmCallback) {
        const shouldProceed = await this.confirmCallback(embeddingsToGenerate.map(item => item.bookmark));
        if (!shouldProceed) {
          console.log('Użytkownik anulował generowanie embeddingów');
          return;
        }
      }

      console.log(`Generowanie ${embeddingsToGenerate.length} nowych embeddingów...`);
      
      for (let i = 0; i < embeddingsToGenerate.length; i += VectorStoreService.CHUNK_SIZE) {
        const chunk = embeddingsToGenerate.slice(i, i + VectorStoreService.CHUNK_SIZE);
        const pageContents = chunk.map(item => item.pageContent);
        
        try {
          console.log(`Generowanie embeddingów dla chunka ${Math.floor(i / VectorStoreService.CHUNK_SIZE) + 1}/${Math.ceil(embeddingsToGenerate.length / VectorStoreService.CHUNK_SIZE)}...`);
          const embeddings = await this.embeddings.embedDocuments(pageContents);
          
          chunk.forEach((item, index) => {
            const newEmbedding: StoredEmbedding = {
              id: item.bookmark.id,
              embedding: embeddings[index],
              pageContent: item.pageContent,
              metadata: item.metadata,
              lastUpdated: Date.now()
            };
            storedEmbeddings.push(newEmbedding);
          });
        } catch (error) {
          console.error('Błąd podczas generowania embeddingów:', error);
          throw error;
        }
      }

      // Zapisz wszystkie embeddingi do bazy
      console.log(`Zapisywanie ${storedEmbeddings.length} embeddingów do bazy...`);
      await this.clearStoredEmbeddings();
      await this.saveStoredEmbeddings(storedEmbeddings);

      // Dodaj nowe dokumenty do VectorStore
      console.log(`Dodawanie ${embeddingsToGenerate.length} nowych dokumentów do VectorStore...`);
      await this.buildVectorStore(storedEmbeddings.map(e => ({
        pageContent: e.pageContent,
        metadata: e.metadata
      })));
    }

    console.log('Zakończono przetwarzanie zakładek');
  }

  // Dodajmy metodę do ręcznego odświeżania embeddingów
  async regenerateEmbeddings() {
    if (!this.currentApiKey) {
      throw new Error('Brak klucza API do regeneracji embeddingów');
    }

    if (this.db) {
      const transaction = this.db.transaction([VectorStoreService.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(VectorStoreService.STORE_NAME);
      await new Promise<void>((resolve, reject) => {
        const request = store.clear();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    }

    this.vectorStore = null;
    this.embeddings = null;
    
    await this.initialize(this.currentApiKey, this.provider);
    
    if (this.documents.length > 0) {
      const bookmarks: BookmarkEntity[] = this.documents.map((doc) => ({
        id: doc.metadata.bookmarkId,
        title: doc.metadata.title,
        url: doc.metadata.url,
        metadata: doc.metadata
      }));
      await this.addBookmarks(bookmarks);
    }
  }

  async similaritySearch(query: string, k: number = 5): Promise<Array<{pageContent: string, metadata: any}>> {
    if (!this.vectorStore) {
      throw new Error('VectorStore nie jest zainicjalizowany');
    }

    console.log('\n=== ROZPOCZYNAM WYSZUKIWANIE ===');
    console.log('Zapytanie:', query);
    console.log('Liczba dokumentów w bazie:', this.documents.length);

    try {
      // Normalizuj zapytanie
      const normalizedQuery = this.normalizeContent(query);
      console.log('Znormalizowane zapytanie:', normalizedQuery);
      const queryKeywords = this.extractKeywordsFromText(query);
      console.log('Słowa kluczowe z zapytania:', queryKeywords);

      // Najpierw znajdź dokumenty po słowach kluczowych
      const keywordResults = this.documents.map(doc => {
        const titleScore = this.calculateKeywordMatch(queryKeywords, this.extractKeywordsFromText(doc.metadata.title));
        const urlScore = this.calculateKeywordMatch(queryKeywords, this.extractKeywordsFromUrl(doc.metadata.url));
        const contentScore = this.calculateKeywordMatch(queryKeywords, doc.pageContent);

        // Oblicz łączny score dla słów kluczowych
        const keywordScore = Math.max(
          titleScore * 1.0,    // Pełne dopasowanie w tytule
          urlScore * 0.8,      // Prawie pełne dopasowanie w URL
          contentScore * 0.6    // Dopasowanie w treści
        );

        return {
          doc: doc as SearchDocument,
          keywordScore,
          titleScore,
          urlScore,
          contentScore
        } as KeywordSearchResult;
      });

      // Filtruj dokumenty, które mają jakiekolwiek dopasowanie słów kluczowych
      const keywordMatches = keywordResults.filter(r => r.keywordScore > 0);
      console.log(`\nZnaleziono ${keywordMatches.length} dopasowań po słowach kluczowych`);

      // Jeśli mamy wystarczająco dużo dopasowań po słowach kluczowych, użyj ich
      if (keywordMatches.length >= k) {
        const results = keywordMatches
          .sort((a, b) => b.keywordScore - a.keywordScore)
          .slice(0, k);

        // Loguj wyniki
        console.log('\nZnalezione dokumenty (wyszukiwanie po słowach kluczowych):');
        results.forEach(({doc, keywordScore, titleScore, urlScore, contentScore}, index) => {
          console.log(`\n[${index + 1}] Wyniki scoringu:`);
          console.log(`- Score słów kluczowych:`);
          console.log(`  • Tytuł: ${titleScore.toFixed(4)}`);
          console.log(`  • URL: ${urlScore.toFixed(4)}`);
          console.log(`  • Treść: ${contentScore.toFixed(4)}`);
          console.log(`  • Łączny: ${keywordScore.toFixed(4)}`);
          console.log('Tytuł:', doc.metadata.title);
          console.log('URL:', doc.metadata.url);
          console.log('Folder:', doc.metadata.folderPath);
        });

        return results.map(r => r.doc);
      }

      // Jeśli nie mamy wystarczająco dopasowań po słowach kluczowych,
      // użyj wyszukiwania wektorowego jako uzupełnienia
      console.log('\nZa mało dopasowań po słowach kluczowych, używam wyszukiwania wektorowego...');
      
      // Generuj embedding dla zapytania
      const queryEmbedding = await this.embeddings.embedQuery(normalizedQuery);
      const vectorResults = await this.vectorStore.similaritySearchVectorWithScore(
        queryEmbedding,
        k * 2
      );

      // Połącz wyniki z obu metod
      const combinedResults = [...keywordMatches];
      
      // Dodaj wyniki wektorowe, które nie są już w wynikach słów kluczowych
      for (const [doc, vectorScore] of vectorResults) {
        if (!combinedResults.some(r => r.doc.metadata.url === doc.metadata.url)) {
          combinedResults.push({
            doc: doc as SearchDocument,
            keywordScore: 0,
            titleScore: 0,
            urlScore: 0,
            contentScore: 0,
            vectorScore: 1 - vectorScore
          } as KeywordSearchResult);
        }
      }

      // Sortuj i wybierz najlepsze wyniki
      const finalResults = combinedResults
        .sort((a, b) => {
          const aScore = a.keywordScore || ((a.vectorScore || 0) * 0.5);
          const bScore = b.keywordScore || ((b.vectorScore || 0) * 0.5);
          return bScore - aScore;
        })
        .slice(0, k);

      // Loguj wyniki
      console.log('\nZnalezione dokumenty (wyniki połączone):');
      finalResults.forEach(({doc, keywordScore, titleScore, urlScore, contentScore, vectorScore}, index) => {
        console.log(`\n[${index + 1}] Wyniki scoringu:`);
        if (keywordScore > 0) {
          console.log(`- Score słów kluczowych:`);
          console.log(`  • Tytuł: ${titleScore?.toFixed(4) || '0.0000'}`);
          console.log(`  • URL: ${urlScore?.toFixed(4) || '0.0000'}`);
          console.log(`  • Treść: ${contentScore?.toFixed(4) || '0.0000'}`);
          console.log(`  • Łączny: ${keywordScore.toFixed(4)}`);
        }
        if (vectorScore) {
          console.log(`- Score wektorowy: ${vectorScore.toFixed(4)}`);
        }
        console.log('Tytuł:', doc.metadata.title);
        console.log('URL:', doc.metadata.url);
        console.log('Folder:', doc.metadata.folderPath);
      });

      return finalResults.map(r => r.doc);
    } catch (error) {
      console.error('Błąd podczas wyszukiwania:', error);
      throw error;
    }
  }

  private calculateKeywordMatch(queryKeywords: string, docKeywords: string | undefined): number {
    if (!queryKeywords || !docKeywords) return 0;
    
    const queryWords = new Set(queryKeywords.toLowerCase().split(/\s+/));
    const docWords = new Set(docKeywords.toLowerCase().split(/\s+/));
    
    if (queryWords.size === 0 || docWords.size === 0) return 0;

    let exactMatches = 0;
    let partialMatches = 0;

    for (const queryWord of queryWords) {
      // Sprawdź dokładne dopasowania
      if (docWords.has(queryWord)) {
        exactMatches++;
        continue;
      }

      // Sprawdź częściowe dopasowania
      for (const docWord of docWords) {
        if (docWord.includes(queryWord) || queryWord.includes(docWord)) {
          partialMatches++;
          break;
        }
      }
    }

    // Oblicz końcowy wynik
    const exactScore = exactMatches / queryWords.size;
    const partialScore = partialMatches / queryWords.size * 0.5; // Częściowe dopasowania mają mniejszą wagę
    
    return Math.min(1, exactScore + partialScore); // Maksymalnie 1.0
  }

  // Nowa metoda do debugowania
  getStats() {
    return {
      isInitialized: !!this.vectorStore && !!this.embeddings,
      documentsCount: this.documents.length,
      documents: this.documents
    };
  }

  // Dodajmy metodę do debugowania
  getDebugInfo() {
    const folderStructure: Record<string, any> = {};
    
    // Budujemy strukturę folderów z dokumentów
    for (const doc of this.documents) {
      const path = doc.metadata?.folderPath?.split('/') || [];
      let current = folderStructure;
      
      for (const folder of path) {
        if (!folder) continue;
        current[folder] = current[folder] || {};
        current = current[folder];
      }
      
      // Dodajemy zakładkę do aktualnego folderu
      if (doc.metadata.title && doc.metadata.url) {
        current[doc.metadata.title] = {
          url: doc.metadata.url,
          description: doc.metadata.description,
          tags: doc.metadata.tags
        };
      }
    }

    return {
      isInitialized: !!this.vectorStore && !!this.embeddings,
      provider: this.provider,
      embeddingsStatus: !!this.embeddings,
      vectorStoreStatus: !!this.vectorStore,
      documentsCount: this.documents.length,
      sampleDocuments: this.documents.slice(0, 5).map(doc => ({
        title: doc.metadata.title,
        url: doc.metadata.url,
        description: doc.metadata.description,
        tags: doc.metadata.tags,
        folderPath: doc.metadata.folderPath
      })),
      folderStructure
    };
  }

  async getDatabaseStats() {
    if (!this.db) {
      console.log('Baza danych nie jest zainicjalizowana');
      return null;
    }

    const stats = {
      embeddingsCount: 0,
      lastUpdated: null as number | null,
      embeddingsWithoutVectors: 0
    };

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([VectorStoreService.STORE_NAME], 'readonly');
      const store = transaction.objectStore(VectorStoreService.STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const embeddings = request.result;
        stats.embeddingsCount = embeddings.length;
        stats.embeddingsWithoutVectors = embeddings.filter(e => !e.embedding || e.embedding.length === 0).length;
        
        if (embeddings.length > 0) {
          stats.lastUpdated = Math.max(...embeddings.map(e => e.lastUpdated || 0));
        }
        
        console.log('Stan bazy danych:', {
          totalEmbeddings: stats.embeddingsCount,
          lastUpdated: stats.lastUpdated ? new Date(stats.lastUpdated).toLocaleString() : 'brak',
          embeddingsWithoutVectors: stats.embeddingsWithoutVectors
        });
        
        resolve(stats);
      };
    });
  }

  private async clearStoredEmbeddings(): Promise<void> {
    if (!this.db) throw new Error('Baza danych nie jest zainicjalizowana');
    const db = this.db; // Przypisanie do stałej dla TypeScript
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([VectorStoreService.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(VectorStoreService.STORE_NAME);
      const request = store.clear();
      
      request.onsuccess = () => {
        console.log('Wyczyszczono stare embeddingi');
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  private async saveStoredEmbeddings(embeddings: StoredEmbedding[]): Promise<void> {
    if (!this.db) throw new Error('Baza danych nie jest zainicjalizowana');
    const db = this.db; // Przypisanie do stałej dla TypeScript
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([VectorStoreService.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(VectorStoreService.STORE_NAME);
      
      embeddings.forEach(embedding => {
        store.put(embedding);
      });
      
      transaction.oncomplete = () => {
        console.log(`Zapisano ${embeddings.length} embeddingów`);
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    });
  }

  private async buildVectorStore(documents: Array<{pageContent: string, metadata: any}>) {
    try {
      if (documents.length > 0) {
        // Zachowaj dokumenty do późniejszego użycia
        this.documents = documents;
        this.vectorStore = await MemoryVectorStore.fromDocuments(
          documents,
          this.embeddings
        );
        console.log(`VectorStore zainicjalizowany z ${documents.length} dokumentami`);
      } else {
        console.log('Inicjalizacja pustego VectorStore...');
        this.vectorStore = new MemoryVectorStore(this.embeddings);
      }
    } catch (error) {
      console.error('Błąd podczas budowania VectorStore:', error);
      throw error;
    }
  }

  setDebugMode(enabled: boolean) {
    this.isDebugMode = enabled;
    console.log(`Debug mode ${enabled ? 'włączony' : 'wyłączony'} (limit: ${VectorStoreService.TEST_MODE_LIMIT} zakładek)`);
  }

  private buildPageContent(bookmark: BookmarkEntity): string {
    const folderPath = bookmark.metadata?.folderPath || '';
    const description = bookmark.extended?.description || '';
    const tags = bookmark.extended?.tags || [];
    const folderKeywords = folderPath.split('/').join(' ');

    // Dodajemy więcej kontekstu do treści dokumentu
    return this.normalizeContent(`
      Tytuł: ${bookmark.title}
      URL: ${bookmark.url}
      Ścieżka folderu: ${folderPath}
      Słowa kluczowe folderu: ${folderKeywords}
      Opis: ${description}
      Tagi: ${tags.join(', ')}
      Słowa kluczowe: ${this.extractKeywords(bookmark.title)} ${this.extractKeywords(description)} ${this.extractKeywords(folderKeywords)}
    `);
  }

  private extractKeywords(text: string): string {
    if (!text) return '';
    
    // Usuń znaki specjalne i podziel na słowa
    const words = text.toLowerCase()
      .replace(/[^a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2) // tylko słowa dłuższe niż 2 znaki
      .filter(word => !this.isStopWord(word)); // usuń stop words

    // Usuń duplikaty
    return [...new Set(words)].join(' ');
  }

  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'and', 'the', 'dla', 'jest', 'sie', 'nie', 'czy', 'jak',
      'co', 'to', 'tak', 'na', 'w', 'z', 'ze', 'do', 'od', 'za'
    ]);
    return stopWords.has(word);
  }

  private extractKeywordsFromUrl(url: string | undefined): string {
    if (!url) return '';
    try {
      // Usuń protokół i parametry
      const cleanUrl = url.replace(/^https?:\/\//, '').split('?')[0];
      // Podziel na części i usuń rozszerzenia plików
      return cleanUrl
        .split(/[/.-]/)
        .map(part => part.replace(/\.(html|php|aspx|jsp)$/, ''))
        .filter(part => part.length > 2) // tylko części dłuższe niż 2 znaki
        .join(' ');
    } catch (error) {
      console.error('Błąd podczas ekstrakcji słów kluczowych z URL:', error);
      return '';
    }
  }

  private extractKeywordsFromText(text: string | undefined): string {
    if (!text) return '';
    return text
      .toLowerCase()
      .replace(/[^a-ząćęłńóśźż\s]/g, ' ') // zostaw tylko litery i spacje
      .split(/\s+/)
      .filter(word => word.length > 2) // tylko słowa dłuższe niż 2 znaki
      .join(' ');
  }
}

export const vectorStoreService = new VectorStoreService(); 