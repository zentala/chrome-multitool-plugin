import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import { BookmarkEntity, FolderEntity } from '../../types/bookmarks.types';
import { BookmarkExtendedData, FolderExtendedData } from '../../types/storage.types';
import { bookmarkExtensionService } from '../../services';
import { Theme } from '@mui/material/styles';
import { makeStyles } from '@mui/styles';
import { EditDataDialog } from './EditDataDialog';
import { localStorageService } from '../../services/localStorage.service';
import { BookmarkChat } from './BookmarkChat';
import { SettingsDialog } from './SettingsDialog';
import { BookmarksTree } from './BookmarksTree';

/**
 * Defines the styles for the BookmarkManagerApp component using makeStyles.
 * @param {Theme} theme - The MUI theme object.
 * @returns {Object} - An object containing the defined styles.
 */
const useStyles = makeStyles((theme: Theme) => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    backgroundColor: '#eee',
  },
  container: {
    marginTop: theme.spacing(4),
    // i want this containwe to be wider
    maxWidth: '100%',
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
    // overflowY: 'auto',
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
  contentContainer: {
    display: 'flex',
    gap: theme.spacing(2),
    flexGrow: 1,
    padding: theme.spacing(3),
    height: 'calc(100vh - 64px)', // 64px to domyślna wysokość AppBar
    overflow: 'hidden' // zapobiega przewijaniu całego kontenera
  },
  chatContainer: {
    width: '50%',
    overflow: 'visible'
  },
  treeContainer: {
    width: '50%',
    overflow: 'visible'
  },
}));

/**
 * The main application component for managing and interacting with bookmarks.
 * It displays bookmarks in a tree structure, allows editing extended data,
 * and provides a chat interface for interacting with bookmarks.
 *
 * @component
 * @example
 * return (
 *   <BookmarkManagerApp />
 * )
 */
export const BookmarkManagerApp: React.FC = () => {
  const classes = useStyles();
  /**
   * State variable holding the array of bookmark entities (folders and bookmarks).
   * @type {BookmarkEntity[]}
   */
  const [bookmarks, setBookmarks] = useState<BookmarkEntity[]>([]);

  /**
   * Ref object to store references to bookmark link elements (anchor tags).
   * Used for attaching click handlers to open bookmarks in new tabs.
   * @type {React.MutableRefObject<{[key: string]: HTMLAnchorElement}>}
   */
  const bookmarkLinksRef = useRef<{ [key: string]: HTMLAnchorElement }>({});
  /**
   * Ref object for the main TreeView container element (UL).
   * Used for potentially attaching event listeners to the tree view.
   * @type {React.MutableRefObject<HTMLUListElement | null>}
   */
  // const treeViewRef = useRef<HTMLUListElement>(null); // Unused ref
  /**
   * Ref object to store references to view mode toggle buttons.
   * Used for attaching click handlers to switch between view modes.
   * @type {React.MutableRefObject<{[key: string]: HTMLButtonElement}>}
   */
  // const viewButtonsRef = useRef<{ [key: string]: HTMLButtonElement }>({}); // Unused ref

  /**
   * State variable controlling the visibility of the edit dialog.
   * @type {boolean}
   */
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  /**
   * State variable holding the bookmark item currently being edited.
   * Contains the bookmark entity and a flag indicating if it's a folder.
   * @type {{ bookmark: BookmarkEntity; isFolder: boolean; } | null}
   */
  const [editingItem, setEditingItem] = useState<{
    bookmark: BookmarkEntity;
    isFolder: boolean;
  } | null>(null);

  /**
   * State variable controlling the visibility of the settings dialog.
   * @type {boolean}
   */
  const [settingsOpen, setSettingsOpen] = useState(false);

  /**
   * Fetches the bookmark tree from the Chrome API and enriches it
   * with extended data stored in local storage. Updates the `bookmarks` state.
   * @async
   * @function
   * @returns {Promise<void>}
   */
  const fetchBookmarksWithExtendedData = async () => {
    try {
      const tree = await chrome.bookmarks.getTree();
      
      if (tree[0].children && tree[0].children.length > 0) {
        const enrichedTree = await enrichBookmarksWithExtendedData(tree[0].children);
        setBookmarks(enrichedTree);
      } else {
        setBookmarks([]);
      }
    } catch (error) {
      console.error('Błąd:', error);
    }
  };

  /**
   * useEffect hook to initialize bookmarks when the component mounts.
   * Calls `fetchBookmarksWithExtendedData` to load the initial data.
   */
  useEffect(() => {
    const initializeBookmarks = async () => {
      await fetchBookmarksWithExtendedData();
    };

    initializeBookmarks();
    
    return () => {
    };
  }, []);

  /**
   * useEffect hook to manage click events on bookmark links.
   * Attaches event listeners to anchor elements stored in `bookmarkLinksRef`
   * to open the corresponding URL in a new tab when clicked.
   * Cleans up listeners on component unmount or when the ref changes.
   */
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
      Object.entries(bookmarkLinksRef.current).forEach(([, element]) => {
        element.removeEventListener('click', () => {});
      });
    };
  }, [bookmarkLinksRef.current]);

  /**
   * Recursively enriches a list of bookmark tree nodes with extended data
   * fetched from the `bookmarkExtensionService` (local storage).
   * @async
   * @function
   * @param {chrome.bookmarks.BookmarkTreeNode[] | undefined} nodes - The list of nodes to enrich.
   * @returns {Promise<BookmarkEntity[]>} - A promise that resolves to the list of enriched bookmark entities.
   */
  const enrichBookmarksWithExtendedData = async (
    nodes: chrome.bookmarks.BookmarkTreeNode[] | undefined
  ): Promise<BookmarkEntity[]> => {
    if (!nodes) {
      return [];
    }
    
    const limitedNodes = nodes.slice(0, 100);
    
    const enrichedNodes = await Promise.all(
      limitedNodes.map(async (node) => {
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

  /**
   * Handles the click event on the edit icon for a bookmark or folder.
   * Sets the `editingItem` state with the selected bookmark/folder and
   * opens the edit dialog by setting `editDialogOpen` to true.
   * @function
   * @param {BookmarkEntity} bookmark - The bookmark or folder entity to edit.
   * @param {boolean} isFolder - Flag indicating whether the item is a folder.
   */
  const handleEditClick = (bookmark: BookmarkEntity, isFolder: boolean) => {
    setEditingItem({ bookmark, isFolder });
    setEditDialogOpen(true);
  };

  /**
   * Handles saving the extended data entered in the edit dialog.
   * Saves the data to local storage using `localStorageService` and
   * updates the `bookmarks` state with the new data using `updateBookmarkInTree`.
   * Closes the edit dialog.
   * @async
   * @function
   * @param {Partial<BookmarkExtendedData | FolderExtendedData>} data - The (potentially partial) extended data to save.
   * @returns {Promise<void>}
   */
  const handleSaveExtendedData = async (data: Partial<BookmarkExtendedData | FolderExtendedData>) => {
    if (!editingItem) return;
    
    try {
      if (editingItem.isFolder) {
        await localStorageService.saveFolderData(editingItem.bookmark.id, data);
      } else {
        await localStorageService.saveBookmarkData(editingItem.bookmark.id, data);
      }
      
      // Odśwież dane zakładek
      setBookmarks(prevBookmarks => 
        updateBookmarkInTree(prevBookmarks, editingItem.bookmark.id, data)
      );
      setEditDialogOpen(false);
    } catch (error) {
      console.error('Błąd podczas zapisywania:', error);
    }
  };

  /**
   * Recursively finds and updates a bookmark or folder within the bookmark tree structure.
   * Returns a new array with the updated item, maintaining immutability.
   * @function
   * @param {BookmarkEntity[]} bookmarks - The current array of bookmark entities.
   * @param {string} id - The ID of the bookmark or folder to update.
   * @param {Partial<BookmarkExtendedData | FolderExtendedData>} newData - The new (potentially partial) extended data to merge.
   * @returns {BookmarkEntity[]} - A new array of bookmark entities with the specified item updated.
   */
  const updateBookmarkInTree = (
    bookmarks: BookmarkEntity[],
    id: string,
    newData: Partial<BookmarkExtendedData | FolderExtendedData>
  ): BookmarkEntity[] => {
    return bookmarks.map(bookmark => {
      if (bookmark.id === id) {
        // Merge existing extended data with new partial data
        const existingExtended = bookmark.extended || {}; 
        return {
          ...bookmark,
          extended: { ...existingExtended, ...newData }
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

  return (
    <div className={classes.root}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 400 }}>
            Chat with bookmarks
          </Typography>
          <IconButton color="inherit" onClick={() => setSettingsOpen(true)}>
            <SettingsIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box className={classes.contentContainer}>
        <BookmarksTree
          bookmarks={bookmarks}
          onEditClick={handleEditClick}
          bookmarkLinksRef={bookmarkLinksRef}
        />

        <BookmarkChat
          bookmarks={bookmarks}
        />
      </Box>

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