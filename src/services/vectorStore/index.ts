// Import the class first
import { VectorStoreService } from './VectorStoreService';

// Service instance export
export const vectorStoreService = new VectorStoreService();

// Main service export
export { VectorStoreService };

// Service interfaces and types
export type {
  IVectorStoreService,
  StoredEmbedding,
  BookmarkMetadataWithId,
  SearchDocument,
  KeywordSearchResult,
  EmbeddingsAdapter,
  DatabaseStats,
  SearchConfig,
  KeywordExtractionResult,
  BookmarkProcessingOptions,
  EmbeddingGenerationRequest,
  SimilaritySearchResult,
  VectorStoreConfig
} from './types';

export type { EmbeddingProvider } from './types';

// Individual service exports for advanced usage
export { IndexedDBService } from './database/IndexedDBService';
export { EmbeddingService } from './embeddings/EmbeddingService';
export { TextProcessor } from './text/TextProcessor';
export { KeywordExtractor } from './text/KeywordExtractor';
export { SimilaritySearch } from './search/SimilaritySearch';
export { BookmarkProcessor } from './bookmarks/BookmarkProcessor';

// Re-export commonly used types from dependencies
export type { BookmarkEntity } from '../../types/bookmarks.types';
export type { BookmarkEntity as ChromeBookmarkEntity } from '../../types/bookmarks.types';
