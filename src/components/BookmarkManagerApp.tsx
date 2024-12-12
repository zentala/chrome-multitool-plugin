import * as React from 'react';
import { useState, useEffect, ChangeEvent, useRef } from 'react';
import { 
  AppBar,
  Toolbar,
  Typography,
  Container,
  Paper,
  CircularProgress,
  ToggleButton, 
  ToggleButtonGroup,
  IconButton,
  Box
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import EditIcon from '@mui/icons-material/Edit';
import SettingsIcon from '@mui/icons-material/Settings';
import { BookmarkEntity, FolderEntity } from '../types/bookmarks.types';
import { BookmarkExtendedData, FolderExtendedData } from '../types/storage.types';
import { bookmarkExtensionService } from '../services';
import { Theme } from '@mui/material/styles';
import { makeStyles } from '@mui/styles';
import { TreeView, TreeItem } from '@mui/x-tree-view';
import { EditDataDialog } from './EditDataDialog';
import { localStorageService } from '../services/localStorage.service';
import { BookmarkChat } from './BookmarkChat';
import { SettingsDialog } from './SettingsDialog';
import { BookmarksTree } from './BookmarksTree';

const useStyles = makeStyles((theme: Theme) => ({
  root: {
    flexGrow: 1,
  },
  container: {
    marginTop: theme.spacing(4),
  },
  paper: {
    padding: theme.spacing(2),
  },
  viewControls: {
    marginBottom: theme.spacing(2),
    display: 'flex',
    justifyContent: 'flex-end',
  },
  treeView: {
    height: '100%',
    minHeight: '400px',
    flexGrow: 1,
    maxWidth: '100%',
    overflowY: 'auto',
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
    padding: theme.spacing(2),
    '& .MuiTreeItem-root': {
      '& .MuiTreeItem-content': {
        padding: theme.spacing(0.5, 0),
        '&:hover': {
          backgroundColor: theme.palette.action.hover,
        },
        '& .MuiTreeItem-label': {
          padding: theme.spacing(0.5, 0),
        },
      },
      '& .MuiTreeItem-group': {
        marginLeft: theme.spacing(2),
        borderLeft: `1px dashed ${theme.palette.divider}`,
        paddingLeft: theme.spacing(1),
      },
    },
  },
  jsonView: {
    padding: theme.spacing(2),
    overflowX: 'auto',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    minHeight: '400px',
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
    backgroundColor: theme.palette.background.default,
  },
  loaderContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing(4),
    minHeight: '400px',
  },
}));

export const BookmarkManagerApp: React.FC = () => {
  const classes = useStyles();
  const [bookmarks, setBookmarks] = useState<BookmarkEntity[]>([]);
  const [viewMode, setViewMode] = useState<'tree' | 'json'>('tree');
  const [isLoading, setIsLoading] = useState(true);

  const bookmarkLinksRef = useRef<{ [key: string]: HTMLAnchorElement }>({});
  const treeViewRef = useRef<HTMLUListElement>(null);
  const viewButtonsRef = useRef<{ [key: string]: HTMLButtonElement }>({});

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<{
    bookmark: BookmarkEntity;
    isFolder: boolean;
  } | null>(null);

  const [settingsOpen, setSettingsOpen] = useState(false);

  const fetchBookmarksWithExtendedData = async () => {
    try {
      setIsLoading(true);
      const tree = await chrome.bookmarks.getTree();
      // console.log('SUROWE DANE Z CHROME:', tree);
      
      if (tree[0].children && tree[0].children.length > 0) {
        const enrichedTree = await enrichBookmarksWithExtendedData(tree[0].children);
        setBookmarks(enrichedTree);
      } else {
        setBookmarks([]);
      }
      setIsLoading(false);
    } catch (error) {
      console.error('Błąd:', error);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isSubscribed = true;

    const initializeBookmarks = async () => {
      await fetchBookmarksWithExtendedData();
    };

    initializeBookmarks();
    
    return () => {
      isSubscribed = false;
    };
  }, []);

  // useEffect(() => {
  //   console.log('AKTUALNY STAN:', bookmarks);
  //   console.log('AKTUALNY TRYB:', viewMode);
  // }, [bookmarks, viewMode]);

  // useEffect(() => {
  //   console.log('AKTUALNY STAN ZAKŁADEK:', bookmarks);
  // }, [bookmarks]);

  useEffect(() => {
    const handleBookmarkClick = (url: string) => {
      chrome.tabs.create({ url });
    };

    Object.entries(bookmarkLinksRef.current).forEach(([url, element]) => {
      element.addEventListener('click', (e) => {
        e.preventDefault();
        handleBookmarkClick(url);
      });
    });

    return () => {
      Object.entries(bookmarkLinksRef.current).forEach(([_, element]) => {
        element.removeEventListener('click', () => {});
      });
    };
  }, [bookmarkLinksRef.current]);

  const enrichBookmarksWithExtendedData = async (
    nodes: chrome.bookmarks.BookmarkTreeNode[] | undefined
  ): Promise<BookmarkEntity[]> => {
    if (!nodes) {
      return [];
    }
    
    const enrichedNodes = await Promise.all(
      nodes.map(async (node) => {
        const enrichedNode: BookmarkEntity = { ...node };
        
        if (node.url) {
          enrichedNode.extended = await bookmarkExtensionService.getBookmarkData(node.id);
        } else {
          const folderData = await bookmarkExtensionService.getFolderData(node.id);
          (enrichedNode as FolderEntity).extended = folderData;
        }

        if (node.children && node.children.length > 0) {
          enrichedNode.children = await enrichBookmarksWithExtendedData(node.children);
        } else {
          enrichedNode.children = [];
        }

        return enrichedNode;
      })
    );

    return enrichedNodes;
  };

  const handleViewModeChange = (mode: 'tree' | 'json') => {
    // console.log('Zmiana trybu widoku na:', mode);
    setViewMode(mode);
  };

  useEffect(() => {
    Object.entries(viewButtonsRef.current).forEach(([mode, button]) => {
      button.addEventListener('click', () => handleViewModeChange(mode as 'tree' | 'json'));
    });

    return () => {
      Object.entries(viewButtonsRef.current).forEach(([_, button]) => {
        button.removeEventListener('click', () => {});
      });
    };
  }, []);

  useEffect(() => {
    const treeView = treeViewRef.current;
    if (!treeView) return;

    const handleNodeToggle = (nodeId: string) => {
      console.log('Przełączono węzeł:', nodeId);
    };

    const treeItems = treeView.getElementsByClassName('MuiTreeItem-root');
    Array.from(treeItems).forEach((item) => {
      item.addEventListener('click', () => {
        const nodeId = item.getAttribute('data-nodeid');
        if (nodeId) handleNodeToggle(nodeId);
      });
    });

    return () => {
      Array.from(treeItems).forEach((item) => {
        item.removeEventListener('click', () => {});
      });
    };
  }, [bookmarks]);

  const handleEditClick = (bookmark: BookmarkEntity, isFolder: boolean) => {
    setEditingItem({ bookmark, isFolder });
    setEditDialogOpen(true);
  };

  const handleSaveExtendedData = async (data: any) => {
    if (!editingItem) return;
    
    try {
      if (editingItem.isFolder) {
        await localStorageService.saveFolderData(editingItem.bookmark.id, data);
      } else {
        await localStorageService.saveBookmarkData(editingItem.bookmark.id, data);
      }
      
      // Odśwież dane zakładek
      setBookmarks(prevBookmarks => 
        updateBookmarkInTree(prevBookmarks, editingItem.bookmark.id, {
          ...data,
          isFolder: editingItem.isFolder
        })
      );
      setEditDialogOpen(false);
    } catch (error) {
      console.error('Błąd podczas zapisywania:', error);
    }
  };

  const updateBookmarkInTree = (
    bookmarks: BookmarkEntity[],
    id: string,
    newData: any
  ): BookmarkEntity[] => {
    return bookmarks.map(bookmark => {
      if (bookmark.id === id) {
        return {
          ...bookmark,
          extended: newData
        };
      }
      if (bookmark.children) {
        return {
          ...bookmark,
          children: updateBookmarkInTree(bookmark.children, id, newData)
        };
      }
      return bookmark;
    });
  };

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
            handleEditClick(bookmark, isFolder);
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

  const countBookmarks = (nodes: BookmarkEntity[]): number => {
    return nodes.reduce((count, node) => {
      if (node.url) {
        return count + 1;
      }
      if (node.children) {
        return count + countBookmarks(node.children);
      }
      return count;
    }, 0);
  };

  const handleChatCommand = (command: string) => {
    const [cmd, ...args] = command.slice(1).split(' ');
    
    switch (cmd) {
      case 'search':
        // Implementacja wyszukiwania
        break;
        
      case 'tag':
        // Implementacja sugestii tagów
        break;
        
      case 'organize':
        // Implementacja reorganizacji
        break;
        
      default:
        console.warn('Nieznana komenda:', cmd);
    }
  };

  return (
    <div className={classes.root}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Menedżer Zakładek
          </Typography>
          <IconButton color="inherit" onClick={() => setSettingsOpen(true)}>
            <SettingsIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container className={classes.container}>
        <Box sx={{ display: 'flex', gap: 2, height: 'calc(100vh - 120px)' }}>
          <BookmarkChat 
            bookmarks={bookmarks}
            onCommandReceived={(command) => {
              // Obsługa komend
              console.log('Received command:', command);
            }}
          />
          <Paper className={classes.paper} sx={{ flexGrow: 1 }}>
            {viewMode === 'tree' ? (
              <BookmarksTree 
                bookmarks={bookmarks} 
                onEditClick={handleEditClick}
                bookmarkLinksRef={bookmarkLinksRef}
              />
            ) : (
              <pre className={classes.jsonView}>
                {JSON.stringify(bookmarks, null, 2)}
              </pre>
            )}
          </Paper>
        </Box>
      </Container>

      <SettingsDialog 
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      {editingItem && (
        <EditDataDialog
          open={editDialogOpen}
          onClose={() => setEditDialogOpen(false)}
          onSave={handleSaveExtendedData}
          initialData={editingItem.bookmark.extended || {}}
          isFolder={editingItem.isFolder}
        />
      )}
    </div>
  );
}; 