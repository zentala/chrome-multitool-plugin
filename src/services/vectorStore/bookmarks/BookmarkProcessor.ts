import { BookmarkEntity } from '../../../types/bookmarks.types';
import { BookmarkMetadataWithId, StoredEmbedding, EmbeddingsAdapter } from '../types';
import { TextProcessor } from '../text/TextProcessor';
import { SimilaritySearch } from '../search/SimilaritySearch';

export class BookmarkProcessor {
  private static readonly CHUNK_SIZE = 10;
  private static readonly TEST_MODE_LIMIT = 5;
  private isDebugMode: boolean = false;
  private textProcessor: TextProcessor;
  private similaritySearch: SimilaritySearch;

  constructor() {
    this.textProcessor = new TextProcessor();
    this.similaritySearch = new SimilaritySearch();
  }

  /**
   * Flattens bookmark tree structure into a flat array of bookmarks
   */
  flattenBookmarks(bookmarks: BookmarkEntity[]): BookmarkEntity[] {
    const flattened: BookmarkEntity[] = [];
    const folderPaths: string[] = [];
    let processedCount = 0;

    const traverse = (nodes: BookmarkEntity[], parentPath: string = ''): boolean => {
      for (const node of nodes) {
        if (this.isDebugMode && processedCount >= BookmarkProcessor.TEST_MODE_LIMIT) {
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

          if (this.isDebugMode && processedCount >= BookmarkProcessor.TEST_MODE_LIMIT) {
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
      console.log(`TRYB DEBUG: Ograniczono do ${BookmarkProcessor.TEST_MODE_LIMIT} zakładek:`,
        flattened.slice(0, BookmarkProcessor.TEST_MODE_LIMIT).map(b => b.title)
      );
      return flattened.slice(0, BookmarkProcessor.TEST_MODE_LIMIT);
    }

    return flattened;
  }

  /**
   * Processes bookmarks and generates embeddings for new or updated bookmarks
   */
  async processBookmarks(
    bookmarks: BookmarkEntity[],
    storedEmbeddings: StoredEmbedding[],
    embeddingsService: EmbeddingsAdapter,
    onConfirm?: (bookmarks: BookmarkEntity[]) => Promise<boolean>
  ): Promise<StoredEmbedding[]> {
    const flattenedBookmarks = this.flattenBookmarks(bookmarks);
    console.log(`Znaleziono ${flattenedBookmarks.length} zakładek do przetworzenia`);

    const embeddingsToGenerate: Array<{
      bookmark: BookmarkEntity,
      pageContent: string,
      metadata: BookmarkMetadataWithId
    }> = [];

    // Sprawdź które zakładki wymagają nowych embeddingów
    for (const bookmark of flattenedBookmarks) {
      const folderPath = bookmark.metadata?.folderPath || '';
      const pageContent = this.buildPageContent(bookmark);

      const documentMetadata: BookmarkMetadataWithId = {
        bookmarkId: bookmark.id,
        title: bookmark.title,
        url: bookmark.url || '',
        folderPath,
        description: bookmark.extended?.description,
        tags: bookmark.extended?.tags,
        lastModified: bookmark.metadata?.lastModified || Date.now()
      };

      const existingEmbedding = storedEmbeddings.find(e => e.metadata.bookmarkId === bookmark.id);

      if (existingEmbedding) {
        console.log(`\nSprawdzanie zakładki "${bookmark.title}" (ID: ${bookmark.id}):`);
        const normalizedExistingContent = this.textProcessor.normalizeContent(existingEmbedding.pageContent);

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
        const lastModifiedChanged = contentChanged && !this.similaritySearch.compareLastModified(
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
      if (onConfirm) {
        const shouldProceed = await onConfirm(embeddingsToGenerate.map(item => item.bookmark));
        if (!shouldProceed) {
          console.log('Użytkownik anulował generowanie embeddingów');
          return storedEmbeddings;
        }
      }

      console.log(`Generowanie ${embeddingsToGenerate.length} nowych embeddingów...`);

      for (let i = 0; i < embeddingsToGenerate.length; i += BookmarkProcessor.CHUNK_SIZE) {
        const chunk = embeddingsToGenerate.slice(i, i + BookmarkProcessor.CHUNK_SIZE);
        const pageContents = chunk.map(item => item.pageContent);

        try {
          console.log(`Generowanie embeddingów dla chunka ${Math.floor(i / BookmarkProcessor.CHUNK_SIZE) + 1}/${Math.ceil(embeddingsToGenerate.length / BookmarkProcessor.CHUNK_SIZE)}...`);
          const embeddings = await embeddingsService.embedDocuments(pageContents);

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
    }

    console.log('Zakończono przetwarzanie zakładek');
    return storedEmbeddings;
  }

  /**
   * Builds page content for a bookmark
   */
  private buildPageContent(bookmark: BookmarkEntity): string {
    return this.textProcessor.buildPageContent(bookmark);
  }

  /**
   * Sets debug mode
   */
  setDebugMode(enabled: boolean): void {
    this.isDebugMode = enabled;
    console.log(`Debug mode ${enabled ? 'włączony' : 'wyłączony'} (limit: ${BookmarkProcessor.TEST_MODE_LIMIT} zakładek)`);
  }

  /**
   * Gets debug mode status
   */
  getDebugMode(): boolean {
    return this.isDebugMode;
  }
}
