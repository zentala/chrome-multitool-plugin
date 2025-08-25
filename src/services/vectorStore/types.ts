import { BookmarkEntity } from '../../types/bookmarks.types';

// Interface for stored embeddings in IndexedDB
export interface StoredEmbedding {
  id: string;
  embedding: number[];
  pageContent: string;
  metadata: {
    bookmarkId: string;
    title: string;
    url: string | undefined; // Fixed: Allow undefined for folders
    folderPath?: string;
    description?: string;
    tags?: string[];
    lastModified?: number;
    [key: string]: unknown;
  };
  lastUpdated: number;
}

// Define a specific type for metadata used in documents/search
export type BookmarkMetadataWithId = {
  bookmarkId: string;
  title: string;
  url: string | undefined; // Fixed: Allow undefined for folders
  folderPath?: string;
  description?: string;
  tags?: string[];
  lastModified?: number;
  [key: string]: unknown; // Keep unknown for flexibility
};

export interface SearchDocument {
  pageContent: string;
  metadata: BookmarkMetadataWithId;
}

export interface KeywordSearchResult {
  doc: SearchDocument;
  keywordScore: number;
  titleScore: number;
  urlScore: number;
  contentScore: number;
  vectorScore?: number;
}

// Define an interface for the custom embeddings adapter
export interface EmbeddingsAdapter {
  embedQuery(text: string): Promise<number[]>;
  embedDocuments(documents: string[]): Promise<number[][]>;
}

// Interface for database statistics
export interface DatabaseStats {
  embeddingsCount: number;
  lastUpdated: number | null;
  embeddingsWithoutVectors: number;
}

// Interface for search configuration
export interface SearchConfig {
  k: number; // number of results to return
  includeDebugInfo?: boolean;
}

// Interface for keyword extraction results
export interface KeywordExtractionResult {
  titleKeywords: string;
  urlKeywords: string;
  contentKeywords: string;
}

// Interface for bookmark processing options
export interface BookmarkProcessingOptions {
  debugMode?: boolean;
  testModeLimit?: number;
  chunkSize?: number;
}

// Interface for embedding generation request
export interface EmbeddingGenerationRequest {
  bookmark: BookmarkEntity;
  pageContent: string;
  metadata: BookmarkMetadataWithId;
}

// Interface for similarity search results
export interface SimilaritySearchResult {
  pageContent: string;
  metadata: BookmarkMetadataWithId;
  score: number;
  vectorScore?: number;
  keywordScore?: number;
  titleKeywordScore?: number;
  urlKeywordScore?: number;
  contentKeywordScore?: number;
}

// Type for supported embedding providers
export type EmbeddingProvider = 'openai' | 'anthropic';

// Configuration interface for the vector store
export interface VectorStoreConfig {
  provider: EmbeddingProvider;
  apiKey: string;
  debugMode?: boolean;
  testModeLimit?: number;
  chunkSize?: number;
}

// Interface for the main vector store service
export interface IVectorStoreService {
  initialize(apiKey: string, provider: EmbeddingProvider): Promise<boolean>;
  addBookmarks(bookmarks: BookmarkEntity[]): Promise<void>;
  similaritySearch(query: string, k?: number): Promise<SimilaritySearchResult[]>;
  setDebugMode(enabled: boolean): void;
  getStats(): { isInitialized: boolean; documentsCount: number; documents: SearchDocument[] };
  getDebugInfo(): Record<string, unknown>;
  setConfirmCallback(callback: (bookmarks: BookmarkEntity[]) => Promise<boolean>): void;
}

// Type for the page content builder function
export type PageContentBuilder = (bookmark: BookmarkEntity) => string;
