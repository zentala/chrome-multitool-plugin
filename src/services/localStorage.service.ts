import { StorageData, BookmarkExtendedData, FolderExtendedData } from '../types/storage.types';

const STORAGE_KEY = 'bookmark_manager_data';

class LocalStorageService {
  private getData(): StorageData {
    const data = localStorage.getItem(STORAGE_KEY);
    const parsedData = data ? JSON.parse(data) : { bookmarks: {}, folders: {} };
    // console.log('Pobrane dane z localStorage:', parsedData);
    return parsedData;
  }

  private saveData(data: StorageData): void {
    // console.log('Zapisywanie danych do localStorage:', data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    // console.log('Dane zapisane, aktualna zawartość:', this.getData());
  }

  getBookmarkData(id: string): BookmarkExtendedData | null {
    const data = this.getData();
    return data.bookmarks[id] || null;
  }

  getFolderData(id: string): FolderExtendedData | null {
    const data = this.getData();
    return data.folders[id] || null;
  }

  saveBookmarkData(id: string, data: Partial<BookmarkExtendedData>): void {
    console.log('Zapisywanie danych zakładki:', { id, data });
    const storageData = this.getData();
    const newData = {
      ...(storageData.bookmarks[id] || {}),
      ...data,
      lastModified: Date.now()
    };
    console.log('Nowe dane zakładki przed zapisem:', newData);
    storageData.bookmarks[id] = newData;
    this.saveData({...storageData});
  }

  saveFolderData(id: string, data: Partial<FolderExtendedData>): void {
    const storageData = this.getData();
    storageData.folders[id] = {
      ...(storageData.folders[id] || {}),
      ...data,
      lastModified: Date.now()
    };
    this.saveData({...storageData});
  }

  deleteBookmarkData(id: string): void {
    const data = this.getData();
    delete data.bookmarks[id];
    this.saveData(data);
  }

  deleteFolderData(id: string): void {
    const data = this.getData();
    delete data.folders[id];
    this.saveData(data);
  }
}

export const localStorageService = new LocalStorageService();