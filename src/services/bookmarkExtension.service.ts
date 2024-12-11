import { ExtendedBookmarkData, ExtendedFolderData } from '../types/bookmarks.types';

class BookmarkExtensionService {
  private readonly BOOKMARKS_STORAGE_KEY = 'extended_bookmarks_data';
  private readonly FOLDERS_STORAGE_KEY = 'extended_folders_data';

  // Pobierz rozszerzone dane dla zakładki
  async getBookmarkData(bookmarkId: string): Promise<ExtendedBookmarkData | undefined> {
    const data = await chrome.storage.local.get(this.BOOKMARKS_STORAGE_KEY);
    const bookmarksData = data[this.BOOKMARKS_STORAGE_KEY] || {};
    return bookmarksData[bookmarkId] || undefined;
  }

  // Zapisz rozszerzone dane dla zakładki
  async saveBookmarkData(bookmarkId: string, data: Partial<ExtendedBookmarkData>): Promise<void> {
    const storage = await chrome.storage.local.get(this.BOOKMARKS_STORAGE_KEY);
    const bookmarksData = storage[this.BOOKMARKS_STORAGE_KEY] || {};
    
    bookmarksData[bookmarkId] = {
      ...bookmarksData[bookmarkId],
      ...data,
      id: bookmarkId,
      originalBookmarkId: bookmarkId,
      lastModified: new Date().toISOString()
    };

    await chrome.storage.local.set({
      [this.BOOKMARKS_STORAGE_KEY]: bookmarksData
    });
  }

  // Pobierz rozszerzone dane dla folderu
  async getFolderData(folderId: string): Promise<ExtendedFolderData | undefined> {
    const data = await chrome.storage.local.get(this.FOLDERS_STORAGE_KEY);
    const foldersData = data[this.FOLDERS_STORAGE_KEY] || {};
    return foldersData[folderId] || undefined;
  }

  // Zapisz rozszerzone dane dla folderu
  async saveFolderData(folderId: string, data: Partial<ExtendedFolderData>): Promise<void> {
    const storage = await chrome.storage.local.get(this.FOLDERS_STORAGE_KEY);
    const foldersData = storage[this.FOLDERS_STORAGE_KEY] || {};
    
    foldersData[folderId] = {
      ...foldersData[folderId],
      ...data,
      id: folderId,
      originalFolderId: folderId,
      lastModified: new Date().toISOString()
    };

    await chrome.storage.local.set({
      [this.FOLDERS_STORAGE_KEY]: foldersData
    });
  }

  // Usuń rozszerzone dane dla zakładki
  async removeBookmarkData(bookmarkId: string): Promise<void> {
    const storage = await chrome.storage.local.get(this.BOOKMARKS_STORAGE_KEY);
    const bookmarksData = storage[this.BOOKMARKS_STORAGE_KEY] || {};
    
    delete bookmarksData[bookmarkId];
    
    await chrome.storage.local.set({
      [this.BOOKMARKS_STORAGE_KEY]: bookmarksData
    });
  }

  // Usuń rozszerzone dane dla folderu
  async removeFolderData(folderId: string): Promise<void> {
    const storage = await chrome.storage.local.get(this.FOLDERS_STORAGE_KEY);
    const foldersData = storage[this.FOLDERS_STORAGE_KEY] || {};
    
    delete foldersData[folderId];
    
    await chrome.storage.local.set({
      [this.FOLDERS_STORAGE_KEY]: foldersData
    });
  }
}

export const bookmarkExtensionService = new BookmarkExtensionService(); 