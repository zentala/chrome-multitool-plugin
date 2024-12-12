import React from 'react';
import { TreeView, TreeItem } from '@mui/x-tree-view';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { IconButton, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { BookmarkEntity } from '../types/bookmarks.types';
import { BookmarkExtendedData, FolderExtendedData } from '../types/storage.types';

interface BookmarksTreeProps {
  bookmarks: BookmarkEntity[];
  onEditClick: (bookmark: BookmarkEntity, isFolder: boolean) => void;
  bookmarkLinksRef: React.MutableRefObject<{ [key: string]: HTMLAnchorElement }>;
}

export const BookmarksTree: React.FC<BookmarksTreeProps> = ({ 
  bookmarks, 
  onEditClick,
  bookmarkLinksRef 
}) => {
  const renderBookmarkTree = (
    bookmark: BookmarkEntity,
    parentPath: string = ''
  ): React.ReactNode => {
    if (!bookmark || !bookmark.id) return null;

    const isFolder = !bookmark.url;
    const nodePath = `${parentPath}/${bookmark.id}`;
    const extended = bookmark.extended;

    const label = (
      <div style={{ 
        display: 'flex', 
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        width: '100%',
        padding: '4px 0',
      }}>
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          flex: 1
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isFolder ? (
              <span>{bookmark.title || 'Folder'}</span>
            ) : (
              <>
                <a 
                  ref={(el) => {
                    if (el && bookmark.url) {
                      bookmarkLinksRef.current[bookmark.url] = el;
                    }
                  }}
                  href={bookmark.url}
                  style={{ 
                    color: 'inherit', 
                    textDecoration: 'none'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.textDecoration = 'underline';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.textDecoration = 'none';
                  }}
                >
                  {bookmark.title || 'Bez tytułu'}
                </a>
                {bookmark.url && (
                  <Typography variant="caption" color="textSecondary">
                    {bookmark.url}
                  </Typography>
                )}
              </>
            )}
          </div>
          {extended && (
            <div style={{ 
              fontSize: '0.85em',
              color: 'rgba(0, 0, 0, 0.6)',
              marginTop: '4px'
            }}>
              {extended.description && (
                <div style={{ marginBottom: '2px' }}>
                  {extended.description}
                </div>
              )}
              {extended.tags && extended.tags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {extended.tags.map(tag => (
                    <span
                      key={tag}
                      style={{
                        backgroundColor: 'rgba(0, 0, 0, 0.08)',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.85em'
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              {isFolder && (extended as FolderExtendedData).purpose && (
                <div style={{ fontStyle: 'italic', marginTop: '2px' }}>
                  Cel: {(extended as FolderExtendedData).purpose}
                </div>
              )}
              {!isFolder && (extended as BookmarkExtendedData).excerpt && (
                <div style={{ marginTop: '2px' }}>
                  {(extended as BookmarkExtendedData).excerpt}
                </div>
              )}
            </div>
          )}
        </div>
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onEditClick(bookmark, isFolder);
          }}
          style={{ alignSelf: 'flex-start' }}
        >
          <EditIcon fontSize="small" />
        </IconButton>
      </div>
    );

    return (
      <TreeItem
        key={nodePath}
        nodeId={nodePath}
        label={label}
        expandIcon={isFolder ? <ChevronRightIcon /> : null}
        collapseIcon={isFolder ? <ExpandMoreIcon /> : null}
      >
        {bookmark.children?.map((child) => renderBookmarkTree(child, nodePath))}
      </TreeItem>
    );
  };

  return (
    <TreeView
      defaultCollapseIcon={<ExpandMoreIcon />}
      defaultExpandIcon={<ChevronRightIcon />}
    >
      {bookmarks.map((bookmark) => renderBookmarkTree(bookmark))}
    </TreeView>
  );
}; 