export interface ExtendedBookmarkData {
  id: string;
  originalBookmarkId: string;
  llm_summary?: string;
  llm_tags?: string[];
  llm_title?: string;
  llm_recommendation?: string;
  screenshot?: string; // base64
  description?: string;
  lastVisited?: string;
  lastScraped?: string;
  customData?: Record<string, any>;
}

export interface ExtendedFolderData {
  id: string;
  originalFolderId: string;
  description?: string;
  purpose?: string;
  tags?: string[];
  icon?: string;
  customIcon?: string;
  lastModified?: string;
  customData?: Record<string, any>;
}

export interface BookmarkEntity extends chrome.bookmarks.BookmarkTreeNode {
  extended?: ExtendedBookmarkData;
}

export interface FolderEntity extends chrome.bookmarks.BookmarkTreeNode {
  extended?: ExtendedFolderData;
} 