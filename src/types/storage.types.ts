export interface BaseExtendedData {
  description?: string;
  tags?: string[];
  lastModified: number;
}

export interface BookmarkExtendedData extends BaseExtendedData {
  thumbnail?: string;
  screenshot?: string;
  excerpt?: string;
}

export interface FolderExtendedData extends BaseExtendedData {
  purpose?: string;
}

export interface StorageData {
  bookmarks: { [key: string]: BookmarkExtendedData };
  folders: { [key: string]: FolderExtendedData };
} 