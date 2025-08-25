import { StoredEmbedding, DatabaseStats } from '../types';

export class IndexedDBService {
  private static readonly DB_NAME = 'bookmarks_vectorstore';
  private static readonly STORE_NAME = 'embeddings';
  private db: IDBDatabase | null = null;

  async initDB(): Promise<IDBDatabase> {
    return new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(IndexedDBService.DB_NAME, 1);

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
        if (!db.objectStoreNames.contains(IndexedDBService.STORE_NAME)) {
          db.createObjectStore(IndexedDBService.STORE_NAME, { keyPath: 'id' });
        }
      };
    });
  }

  async loadStoredEmbeddings(): Promise<StoredEmbedding[]> {
    if (!this.db) {
      console.log('Inicjalizacja bazy danych...');
      this.db = await this.initDB();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([IndexedDBService.STORE_NAME], 'readonly');
      const store = transaction.objectStore(IndexedDBService.STORE_NAME);
      const request = store.getAll();

      request.onerror = () => {
        console.error('Błąd podczas ładowania embeddingów:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        console.log(`Załadowano ${request.result.length} embeddingów`);
        resolve(request.result as StoredEmbedding[]);
      };
    });
  }

  async saveEmbeddings(embeddings: StoredEmbedding[]): Promise<void> {
    if (!this.db) {
      console.log('Inicjalizacja bazy danych przed zapisem...');
      this.db = await this.initDB();
    }

    return new Promise<void>((resolve, reject) => {
      const transaction = this.db!.transaction([IndexedDBService.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(IndexedDBService.STORE_NAME);

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

  async clearStoredEmbeddings(): Promise<void> {
    if (!this.db) {
      throw new Error('Baza danych nie jest zainicjalizowana');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([IndexedDBService.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(IndexedDBService.STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        console.log('Wyczyszczono stare embeddingi');
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  async saveStoredEmbeddings(embeddings: StoredEmbedding[]): Promise<void> {
    if (!this.db) {
      throw new Error('Baza danych nie jest zainicjalizowana');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([IndexedDBService.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(IndexedDBService.STORE_NAME);

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

  async getDatabaseStats(): Promise<DatabaseStats> {
    if (!this.db) {
      console.log('Baza danych nie jest zainicjalizowana');
      return {
        embeddingsCount: 0,
        lastUpdated: null,
        embeddingsWithoutVectors: 0
      };
    }

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([IndexedDBService.STORE_NAME], 'readonly');
      const store = transaction.objectStore(IndexedDBService.STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        if (!request.result) {
          resolve({
            embeddingsCount: 0,
            lastUpdated: null,
            embeddingsWithoutVectors: 0
          });
          return;
        }

        const embeddings = request.result as StoredEmbedding[];
        const stats: DatabaseStats = {
          embeddingsCount: embeddings.length,
          embeddingsWithoutVectors: embeddings.filter(e => !e.embedding || e.embedding.length === 0).length,
          lastUpdated: embeddings.length > 0 ? Math.max(...embeddings.map(e => e.lastUpdated || 0)) : null
        };

        console.log('Stan bazy danych:', {
          totalEmbeddings: stats.embeddingsCount,
          lastUpdated: stats.lastUpdated ? new Date(stats.lastUpdated).toLocaleString() : 'brak',
          embeddingsWithoutVectors: stats.embeddingsWithoutVectors
        });

        resolve(stats);
      };

      request.onerror = () => {
        console.error('Błąd podczas pobierania statystyk bazy danych');
        resolve({
          embeddingsCount: 0,
          lastUpdated: null,
          embeddingsWithoutVectors: 0
        });
      };
    });
  }

  setDatabase(db: IDBDatabase): void {
    this.db = db;
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}
