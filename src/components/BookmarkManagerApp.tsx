import React, { useEffect, useState } from 'react';
import { BookmarkEntity, FolderEntity } from '../types/bookmarks.types';
import { bookmarkExtensionService } from '../services/bookmarkExtension.service';
import './BookmarkManagerApp.scss';

export const BookmarkManagerApp: React.FC = () => {
  const [bookmarks, setBookmarks] = useState<BookmarkEntity[]>([]);
  const [viewMode, setViewMode] = useState<'tree' | 'json'>('tree');

  useEffect(() => {
    const fetchBookmarksWithExtendedData = async () => {
      try {
        const tree = await chrome.bookmarks.getTree();
        const enrichedTree = await enrichBookmarksWithExtendedData(tree);
        setBookmarks(enrichedTree);
      } catch (error) {
        console.error('Błąd podczas pobierania zakładek:', error);
      }
    };

    fetchBookmarksWithExtendedData();
  }, []);

  const enrichBookmarksWithExtendedData = async (
    nodes: chrome.bookmarks.BookmarkTreeNode[]
  ): Promise<BookmarkEntity[]> => {
    const enrichedNodes = await Promise.all(
      nodes.map(async (node) => {
        const enrichedNode: BookmarkEntity = { ...node };
        
        if (node.url) {
          enrichedNode.extended = await bookmarkExtensionService.getBookmarkData(node.id);
        } else {
          const folderData = await bookmarkExtensionService.getFolderData(node.id);
          (enrichedNode as FolderEntity).extended = folderData;
        }

        if (node.children) {
          enrichedNode.children = await enrichBookmarksWithExtendedData(node.children);
        }

        return enrichedNode;
      })
    );

    return enrichedNodes;
  };

  const renderBookmarkTree = (bookmark: BookmarkEntity, level: number = 0) => {
    const padding = level * 20;

    return (
      <div key={bookmark.id} style={{ paddingLeft: `${padding}px` }}>
        <div className="bookmark-item">
          {bookmark.url ? (
            <a href={bookmark.url} target="_blank" rel="noopener noreferrer">
              <span className="material-icons">bookmark</span>
              {bookmark.title || 'Bez tytułu'}
            </a>
          ) : (
            <div className="folder">
              <span className="material-icons">folder</span>
              {bookmark.title}
            </div>
          )}
        </div>
        {bookmark.children?.map(child => renderBookmarkTree(child, level + 1))}
      </div>
    );
  };

  return (
    <div className="bookmark-manager">
      <header className="header">
        <h1>AI Bookmark Manager</h1>
        <div className="view-controls">
          <button 
            className={viewMode === 'tree' ? 'active' : ''} 
            onClick={() => setViewMode('tree')}
          >
            Widok drzewa
          </button>
          <button 
            className={viewMode === 'json' ? 'active' : ''} 
            onClick={() => setViewMode('json')}
          >
            Widok JSON
          </button>
        </div>
      </header>
      <main className="main-content">
        {viewMode === 'tree' ? (
          <div className="bookmark-tree">
            {bookmarks.map(bookmark => renderBookmarkTree(bookmark))}
          </div>
        ) : (
          <pre className="json-view">
            {JSON.stringify(bookmarks, null, 2)}
          </pre>
        )}
      </main>
    </div>
  );
}; 