import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { BookmarkEntity } from '../../types/bookmarks.types';
import {
  IVectorStoreService,
  EmbeddingProvider,
  SimilaritySearchResult,
  SearchDocument,
  BookmarkMetadataWithId
} from './types';
import { IndexedDBService } from './database/IndexedDBService';
import { EmbeddingService } from './embeddings/EmbeddingService';
import { BookmarkProcessor } from './bookmarks/BookmarkProcessor';
import { SimilaritySearch } from './search/SimilaritySearch';

export class VectorStoreService implements IVectorStoreService {
  private vectorStore: MemoryVectorStore | null = null;
  private dbService: IndexedDBService;
  private embeddingService: EmbeddingService;
  private bookmarkProcessor: BookmarkProcessor;
  private searchService: SimilaritySearch;
  private documents: SearchDocument[] = [];
  private confirmCallback: ((bookmarks: BookmarkEntity[]) => Promise<boolean>) | undefined = undefined;

  constructor() {
    this.dbService = new IndexedDBService();
    this.embeddingService = new EmbeddingService();
    this.bookmarkProcessor = new BookmarkProcessor();
    this.searchService = new SimilaritySearch();
  }

  /**
   * Initializes the vector store service
   */
  async initialize(apiKey: string, provider: EmbeddingProvider): Promise<boolean> {
    try {
      if (this.vectorStore && this.embeddingService.isInitialized()) {
        console.log('VectorStore już zainicjalizowany, pomijam inicjalizację');
        return true;
      }

      console.log('Rozpoczynam inicjalizację VectorStore...');

      // Initialize database
      const db = await this.dbService.initDB();
      this.dbService.setDatabase(db);

      // Initialize embedding service
      const embeddingInitialized = await this.embeddingService.initialize(apiKey, provider);
      if (!embeddingInitialized) {
        throw new Error('Failed to initialize embedding service');
      }

      // Load stored embeddings
      const storedEmbeddings = await this.dbService.loadStoredEmbeddings();
      console.log(`Znaleziono ${storedEmbeddings.length} zapisanych embeddingów w bazie`);

      if (storedEmbeddings.length > 0) {
        console.log('Przykładowy embedding:', {
          id: storedEmbeddings[0].id,
          hasEmbedding: !!storedEmbeddings[0].embedding,
          embeddingLength: storedEmbeddings[0].embedding?.length || 0,
          metadata: storedEmbeddings[0].metadata
        });
      }

      // Initialize VectorStore with stored data
      if (storedEmbeddings.length > 0) {
        console.log('Budowanie VectorStore z załadowanych danych...');
        await this.buildVectorStore(storedEmbeddings.map(e => ({
          pageContent: e.pageContent,
          metadata: e.metadata as BookmarkMetadataWithId
        })));
      } else {
        console.log('Inicjalizacja pustego VectorStore...');
        this.vectorStore = new MemoryVectorStore(this.embeddingService.getEmbeddings());
      }

      console.log('VectorStore zainicjalizowany pomyślnie');
      return true;
    } catch (error) {
      console.error('Błąd podczas inicjalizacji VectorStore:', error);
      return false;
    }
  }

  /**
   * Adds bookmarks to the vector store
   */
  async addBookmarks(bookmarks: BookmarkEntity[]): Promise<void> {
    if (!this.vectorStore || !this.embeddingService.isInitialized()) {
      throw new Error('VectorStore nie jest zainicjalizowany');
    }

    try {
      // Load existing embeddings
      const storedEmbeddings = await this.dbService.loadStoredEmbeddings();

      // Process bookmarks and generate new embeddings
      const updatedEmbeddings = await this.bookmarkProcessor.processBookmarks(
        bookmarks,
        storedEmbeddings,
        this.embeddingService.getEmbeddings(),
        this.confirmCallback
      );

      // Save embeddings to database
      await this.dbService.clearStoredEmbeddings();
      await this.dbService.saveStoredEmbeddings(updatedEmbeddings);

      // Update vector store with new documents
      await this.buildVectorStore(updatedEmbeddings.map(e => ({
        pageContent: e.pageContent,
        metadata: e.metadata as BookmarkMetadataWithId
      })));

      console.log('Zakończono przetwarzanie zakładek');
    } catch (error) {
      console.error('Error adding bookmarks:', error);
      throw error;
    }
  }

  /**
   * Performs similarity search
   */
  async similaritySearch(query: string, k: number = 5): Promise<SimilaritySearchResult[]> {
    if (!this.vectorStore || !this.embeddingService.isInitialized()) {
      throw new Error('VectorStore nie jest zainicjalizowany');
    }

    try {
      return await this.searchService.similaritySearch(
        this.vectorStore,
        this.embeddingService.getEmbeddings(),
        query,
        k
      );
    } catch (error) {
      console.error('Błąd podczas wyszukiwania:', error);
      throw error;
    }
  }

  /**
   * Legacy method for backward compatibility - same as similaritySearch
   */
  async searchBookmarks(query: string, k: number = 5): Promise<SimilaritySearchResult[]> {
    return this.similaritySearch(query, k);
  }

  /**
   * Legacy method for backward compatibility - alias for addBookmarks
   */
  async indexBookmark(bookmark: BookmarkEntity): Promise<void> {
    return this.addBookmarks([bookmark]);
  }

  /**
   * Delete bookmark from the vector store (legacy method)
   */
  async deleteBookmark(bookmarkId: string): Promise<void> {
    try {
      // Load existing embeddings
      const storedEmbeddings = await this.dbService.loadStoredEmbeddings();

      // Filter out the bookmark to delete
      const updatedEmbeddings = storedEmbeddings.filter(e => e.id !== bookmarkId);

      // Save updated embeddings
      await this.dbService.clearStoredEmbeddings();
      await this.dbService.saveStoredEmbeddings(updatedEmbeddings);

      // Update vector store
      await this.buildVectorStore(updatedEmbeddings.map(e => ({
        pageContent: e.pageContent,
        metadata: e.metadata as BookmarkMetadataWithId
      })));

      console.log(`Usunięto zakładkę ${bookmarkId} z vector store`);
    } catch (error) {
      console.error('Error deleting bookmark:', error);
      throw error;
    }
  }

  /**
   * Sets debug mode
   */
  setDebugMode(enabled: boolean): void {
    this.bookmarkProcessor.setDebugMode(enabled);
  }

  /**
   * Gets service statistics
   */
  getStats(): { isInitialized: boolean; documentsCount: number; documents: SearchDocument[] } {
    return {
      isInitialized: this.vectorStore !== null && this.embeddingService.isInitialized(),
      documentsCount: this.documents.length,
      documents: this.documents
    };
  }

  /**
   * Gets debug information
   */
  getDebugInfo(): Record<string, unknown> {
    const folderStructure: Record<string, unknown> = {};

    // Build folder structure from documents
    for (const doc of this.documents) {
      const path = doc.metadata?.folderPath?.split('/') || [];
      let current = folderStructure;

      for (const folder of path) {
        if (!folder) continue;
        if (!current[folder] || typeof current[folder] !== 'object') {
          current[folder] = {};
        }
        current = current[folder] as Record<string, unknown>;
      }

      // Add bookmark to current folder
      if (doc.metadata.title && doc.metadata.url) {
        current[doc.metadata.title] = {
          url: doc.metadata.url,
          description: doc.metadata.description,
          tags: doc.metadata.tags
        };
      }
    }

    return {
      isInitialized: this.vectorStore !== null && this.embeddingService.isInitialized(),
      provider: this.embeddingService.getProvider(),
      embeddingsStatus: this.embeddingService.isInitialized(),
      vectorStoreStatus: !!this.vectorStore,
      documentsCount: this.documents.length,
      sampleDocuments: this.documents.slice(0, 5).map(doc => ({
        title: doc.metadata.title,
        url: doc.metadata.url,
        description: doc.metadata.description,
        tags: doc.metadata.tags,
        folderPath: doc.metadata.folderPath
      })),
      folderStructure,
      databaseStats: async () => await this.dbService.getDatabaseStats()
    };
  }

  /**
   * Sets the confirmation callback
   */
  setConfirmCallback(callback: (bookmarks: BookmarkEntity[]) => Promise<boolean>): void {
    this.confirmCallback = callback;
  }

  /**
   * Builds the vector store from documents
   */
  private async buildVectorStore(documents: SearchDocument[]): Promise<void> {
    try {
      if (documents.length > 0) {
        this.documents = documents;
        this.vectorStore = await MemoryVectorStore.fromDocuments(
          documents,
          this.embeddingService.getEmbeddings()
        );
        console.log(`VectorStore zainicjalizowany z ${documents.length} dokumentami`);
      } else {
        console.log('Inicjalizacja pustego VectorStore...');
        this.vectorStore = new MemoryVectorStore(this.embeddingService.getEmbeddings());
      }
    } catch (error) {
      console.error('Błąd podczas budowania VectorStore:', error);
      throw error;
    }
  }

  /**
   * Regenerates embeddings for all stored bookmarks
   */
  async regenerateEmbeddings(): Promise<boolean> {
    try {
      console.log('Regenerating embeddings...');
      const result = await this.embeddingService.regenerateEmbeddings();
      console.log('Embeddings regenerated successfully');
      return result;
    } catch (error) {
      console.error('Error regenerating embeddings:', error);
      return false;
    }
  }

  /**
   * Closes the service and cleans up resources
   */
  close(): void {
    this.dbService.close();
    this.embeddingService.reset();
    this.vectorStore = null;
    this.documents = [];
    console.log('VectorStore service closed');
  }
}
