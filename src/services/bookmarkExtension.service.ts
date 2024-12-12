import { localStorageService } from './localStorage.service';
import { BookmarkExtendedData, FolderExtendedData } from '../types/storage.types';

class BookmarkExtensionService {
  async getBookmarkData(id: string): Promise<BookmarkExtendedData | null> {
    return localStorageService.getBookmarkData(id);
  }

  async getFolderData(id: string): Promise<FolderExtendedData | null> {
    return localStorageService.getFolderData(id);
  }

  async saveBookmarkData(id: string, data: Partial<BookmarkExtendedData>): Promise<void> {
    localStorageService.saveBookmarkData(id, data);
  }

  async saveFolderData(id: string, data: Partial<FolderExtendedData>): Promise<void> {
    localStorageService.saveFolderData(id, data);
  }
}

export const bookmarkExtensionService = new BookmarkExtensionService();