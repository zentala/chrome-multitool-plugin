import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Anthropic } from "@anthropic-ai/sdk";
import { BookmarkEntity } from '../types/bookmarks.types';

interface StoredEmbedding {
  id: string;
  embedding: number[];
  pageContent: string;
  metadata: any;
  lastUpdated: number;
}

class VectorStoreService {
  private static STORAGE_KEY_PREFIX = 'bookmark_embeddings_';
  private static CHUNK_SIZE = 100; // Ile embeddingów w jednym chunku
  private vectorStore: MemoryVectorStore | null = null;
  private embeddings: any = null;
  private anthropicClient: Anthropic | null = null;
  private documents: Array<{pageContent: string, metadata: any}> = [];
  private provider: 'openai' | 'anthropic' = 'openai';
  private currentApiKey: string = '';

  private async loadStoredEmbeddings(): Promise<StoredEmbedding[]> {
    const allEmbeddings: StoredEmbedding[] = [];
    let chunkIndex = 0;
    
    while (true) {
      const chunk = localStorage.getItem(`${VectorStoreService.STORAGE_KEY_PREFIX}${chunkIndex}`);
      if (!chunk) break;
      
      const chunkData = JSON.parse(chunk);
      allEmbeddings.push(...chunkData);
      chunkIndex++;
    }

    return allEmbeddings;
  }

  private async saveEmbeddings(embeddings: StoredEmbedding[]) {
    // Najpierw wyczyść stare chunki
    let index = 0;
    while (localStorage.getItem(`${VectorStoreService.STORAGE_KEY_PREFIX}${index}`) !== null) {
      localStorage.removeItem(`${VectorStoreService.STORAGE_KEY_PREFIX}${index}`);
      index++;
    }

    // Zapisz nowe chunki
    try {
      for (let i = 0; i < embeddings.length; i += VectorStoreService.CHUNK_SIZE) {
        const chunk = embeddings.slice(i, i + VectorStoreService.CHUNK_SIZE);
        const chunkIndex = Math.floor(i / VectorStoreService.CHUNK_SIZE);
        
        try {
          localStorage.setItem(
            `${VectorStoreService.STORAGE_KEY_PREFIX}${chunkIndex}`,
            JSON.stringify(chunk)
          );
        } catch (error) {
          console.error(`Błąd zapisywania chunka ${chunkIndex}:`, error);
          // Jeśli nie możemy zapisać chunka, zapisujemy tylko metadane bez embeddingów
          const lightChunk = chunk.map(item => ({
            ...item,
            embedding: [] // Oszczędzamy miejsce pomijając same embeddingi
          }));
          localStorage.setItem(
            `${VectorStoreService.STORAGE_KEY_PREFIX}${chunkIndex}`,
            JSON.stringify(lightChunk)
          );
        }
      }
    } catch (error) {
      console.error('Błąd podczas zapisywania embeddingów:', error);
      // W przypadku błędu, zachowujemy tylko ostatnie 1000 embeddingów
      const reducedEmbeddings = embeddings.slice(-1000);
      await this.saveEmbeddings(reducedEmbeddings);
    }
  }

  async initialize(apiKey: string, provider: 'openai' | 'anthropic') {
    this.provider = provider;
    this.currentApiKey = apiKey;
    console.log('Inicjalizacja VectorStore dla:', provider);

    try {
      const embeddings = {
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
            // Uproszczona implementacja dla Claude
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
            // Uproszczona implementacja dla Claude
            return documents.map(() => 
              Array(1024).fill(0).map(() => Math.random())
            );
          }
        }
      };

      this.embeddings = embeddings;

      this.vectorStore = await MemoryVectorStore.fromTexts(
        [],
        [],
        embeddings
      );

      console.log('VectorStore zainicjalizowany pomyślnie');
      return true;
    } catch (error) {
      console.error('Błąd inicjalizacji:', error);
      throw error;
    }
  }

  private flattenBookmarks(bookmarks: BookmarkEntity[]): BookmarkEntity[] {
    const flattened: BookmarkEntity[] = [];
    
    const traverse = (items: BookmarkEntity[]) => {
      for (const item of items) {
        if (!item.url && item.children) {
          // To jest folder, rekurencyjnie przetwarzamy jego zawartość
          traverse(item.children);
        } else if (item.url) {
          // To jest zakładka, dodajemy ją do listy
          flattened.push(item);
        }
      }
    };

    traverse(bookmarks);
    return flattened;
  }

  async addBookmarks(bookmarks: BookmarkEntity[]) {
    if (!this.vectorStore || !this.embeddings) {
      console.error('Baza wektorowa nie jest zainicjalizowana!');
      return;
    }

    // Spłaszczamy drzewo zakładek
    const flattenedBookmarks = this.flattenBookmarks(bookmarks);
    console.log(`Znaleziono ${flattenedBookmarks.length} zakładek do przetworzenia`);

    const storedEmbeddings = await this.loadStoredEmbeddings();
    const newDocuments: Array<{pageContent: string, metadata: any}> = [];
    const updatedEmbeddings: StoredEmbedding[] = [];

    for (const bookmark of flattenedBookmarks) {
      const pageContent = `${bookmark.title} ${bookmark.url}`;
      const metadata = {
        bookmarkId: bookmark.id,
        title: bookmark.title,
        url: bookmark.url,
        description: bookmark.extended?.description || '',
        tags: bookmark.extended?.tags || [],
        lastModified: bookmark.extended?.lastModified || Date.now()
      };

      // Sprawdź czy embedding już istnieje i czy zakładka była modyfikowana
      const existingEmbedding = storedEmbeddings.find(e => e.metadata.bookmarkId === bookmark.id);
      if (existingEmbedding && existingEmbedding.metadata.lastModified === metadata.lastModified) {
        updatedEmbeddings.push(existingEmbedding);
        continue;
      }

      // Generuj nowy embedding
      const embedding = await this.embeddings.embedQuery(pageContent);
      updatedEmbeddings.push({
        id: bookmark.id,
        embedding,
        pageContent,
        metadata,
        lastUpdated: Date.now()
      });

      newDocuments.push({ pageContent, metadata });
    }

    // Zapisz embeddingi
    await this.saveEmbeddings(updatedEmbeddings);

    // Dodaj tylko nowe dokumenty do bazy
    if (newDocuments.length > 0) {
      await this.vectorStore.addDocuments(newDocuments);
      console.log(`Dodano ${newDocuments.length} nowych/zaktualizowanych dokumentów`);
    }

    // Zachowujemy spłaszczoną listę dokumentów
    this.documents = flattenedBookmarks.map(b => ({
      pageContent: `${b.title} ${b.url}`,
      metadata: {
        bookmarkId: b.id,
        title: b.title,
        url: b.url,
        description: b.extended?.description || '',
        tags: b.extended?.tags || []
      }
    }));
  }

  // Dodajmy metodę do ręcznego odświeżania embeddingów
  async regenerateEmbeddings() {
    if (!this.currentApiKey) {
      throw new Error('Brak klucza API do regeneracji embeddingów');
    }

    // Usuń wszystkie chunki
    let index = 0;
    while (localStorage.getItem(`${VectorStoreService.STORAGE_KEY_PREFIX}${index}`) !== null) {
      localStorage.removeItem(`${VectorStoreService.STORAGE_KEY_PREFIX}${index}`);
      index++;
    }

    this.vectorStore = null;
    this.embeddings = null;
    
    await this.initialize(this.currentApiKey, this.provider);
    
    if (this.documents.length > 0) {
      const bookmarks: BookmarkEntity[] = this.documents.map(doc => ({
        id: doc.metadata.bookmarkId,
        title: doc.metadata.title,
        url: doc.metadata.url,
        extended: {
          description: doc.metadata.description,
          tags: doc.metadata.tags,
          lastModified: doc.metadata.lastModified
        }
      }));
      await this.addBookmarks(bookmarks);
    }
  }

  async similaritySearch(query: string, k = 5) {
    if (!this.vectorStore) {
      console.error('Baza wektorowa nie jest zainicjalizowana!');
      return [];
    }

    console.log(`\nWyszukiwanie dla zapytania: "${query}"`);
    const results = await this.vectorStore.similaritySearch(query, k);
    
    console.log('\nZnalezione dokumenty:');
    results.forEach((doc, i) => {
      console.log(`\n${i + 1}. Dokument:`);
      console.log('Treść:', doc.pageContent);
      console.log('Metadata:', doc.metadata);
    });

    return results;
  }

  // Nowa metoda do debugowania
  getStats() {
    return {
      isInitialized: !!this.vectorStore && !!this.embeddings,
      documentsCount: this.documents.length,
      documents: this.documents
    };
  }
}

export const vectorStoreService = new VectorStoreService(); 