import { FolderExtendedData } from './storage.types';

export interface BookmarkExtendedData {
  description?: string;
  tags?: string[];
  lastModified?: number;
}

export interface BookmarkMetadata {
  folderPath?: string;
  lastModified?: number;
  [key: string]: any;
}

export interface BookmarkEntity extends chrome.bookmarks.BookmarkTreeNode {
  children?: BookmarkEntity[];
  extended?: BookmarkExtendedData | null;
  metadata?: BookmarkMetadata;
}

export interface FolderEntity extends BookmarkEntity {
  url?: undefined;
  extended?: FolderExtendedData | null;
}


// xport interface ExtendedBookmarkData {
//   id: string;
//   originalBookmarkId: string;
//   // Istniejące pola
//   llm_tags?: string[];
//   llm_title?: string;
//   llm_recommendation?: string;
//   screenshot?: string; // base64
//   description?: string;
//   lastModified?: string;
//   lastVisited?: string;
//   lastScraped?: string;
//   customData?: Record<string, any>;
//   // Nowe pola
//   thumbnail?: string;
//   excerpt?: string;
//   favicon?: string;
//   metadata?: {
//     title?: string;
//     author?: string;
//     publishDate?: string;
//     readingTime?: number;
//   };
//   userNotes?: string;
//   priority?: number; // 1-5
//   status?: ('to-read' | 'reading' | 'read' | 'archived' | 'starred' | 'favorites' | 'frequently-visited')[];
// }

// export interface ExtendedFolderData {
//   id: string;
//   originalFolderId: string;
//   // Istniejące pola
//   description?: string;
//   purpose?: string;
//   tags?: string[];
//   icon?: string;
//   customIcon?: string;
//   lastModified?: string;
//   customData?: Record<string, any>;
//   // Nowe pola
//   guidelines?: string;
//   category?: string;
//   isPrivate?: boolean;
//   sortOrder?: 'alphabetical' | 'custom' | 'dateAdded' | 'lastVisited';
//   customSortOrder?: string[]; // array of bookmark IDs
//   color?: string; // dla wizualnego oznaczenia folderów
//   parentFolderIds?: string[]; // dla śledzenia hierarchii
//   displayFormat?: 'grid' | 'table';
//   status?: ('starred' | 'favorites')[];
// }
