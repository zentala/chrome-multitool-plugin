import React, { useState, useEffect, ChangeEvent } from 'react';
import { 
  makeStyles,
  AppBar,
  Toolbar,
  Typography,
  Container,
  Paper,
  CircularProgress 
} from '@material-ui/core';
import { 
  ToggleButton, 
  ToggleButtonGroup,
  TreeView,
  TreeItem 
} from '@material-ui/lab';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { BookmarkEntity, FolderEntity } from '../types/bookmarks.types';
import { bookmarkExtensionService } from '../services/bookmarkExtension.service';
import TestToggleButton from './TestToggleButton';

const useStyles = makeStyles((theme) => ({
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

  useEffect(() => {
    let isSubscribed = true;

    const fetchBookmarksWithExtendedData = async () => {
      try {
        setIsLoading(true);
        const tree = await chrome.bookmarks.getTree();
        console.log('SUROWE DANE Z CHROME:', tree);
        
        if (!isSubscribed) return;

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

    fetchBookmarksWithExtendedData();
    
    return () => {
      isSubscribed = false;
    };
  }, []);

  useEffect(() => {
    console.log('AKTUALNY STAN:', bookmarks);
    console.log('AKTUALNY TRYB:', viewMode);
  }, [bookmarks, viewMode]);

  useEffect(() => {
    console.log('AKTUALNY STAN ZAKŁADEK:', bookmarks);
  }, [bookmarks]);

  const enrichBookmarksWithExtendedData = async (
    nodes: chrome.bookmarks.BookmarkTreeNode[] | undefined
  ): Promise<BookmarkEntity[]> => {
    if (!nodes) {
      return [];
    }
    // console.log('Struktura drzewa:', nodes.map(node => ({
    //   id: node.id,
    //   title: node.title,
    //   childrenCount: node.children ? node.children.length : 0
    // })));
    
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

  const handleViewModeChange = (
    event: React.MouseEvent<HTMLElement>,
    newMode: 'tree' | 'json' | null
  ) => {
    if (newMode) {
      console.log('Zmiana trybu widoku na:', newMode);
      setViewMode(newMode);
    }
  };

  const renderBookmarkTree = (
    bookmark: BookmarkEntity,
    parentPath: string = ''
  ): React.ReactNode => {
    if (!bookmark || !bookmark.id) return null;

    // console.log('Renderowanie węzła:', bookmark);

    const isFolder = !bookmark.url;
    const nodePath = `${parentPath}/${bookmark.id}`;

    const label = (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center',
        padding: '4px 0',
        color: isFolder ? 'inherit' : '#1976d2'
      }}>
        {isFolder ? (
          <span>{bookmark.title || 'Folder'}</span>
        ) : (
          <a 
            href={bookmark.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
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
        )}
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

  return (
    <div className={classes.root}>
                  <TestToggleButton />
                  
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6">
            Menedżer Zakładek
          </Typography>
        </Toolbar>
      </AppBar>

      <Container className={classes.container}>
        <Paper className={classes.paper}>
          <div className={classes.viewControls}>
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={handleViewModeChange}
              aria-label="view mode"
            >
              <ToggleButton value="tree">
                Tree ({bookmarks?.length || 0})
              </ToggleButton>
              <ToggleButton value="json">
                JSON
              </ToggleButton>
            </ToggleButtonGroup>
          </div>

          {isLoading ? (
            <div className={classes.loaderContainer}>
              <CircularProgress />
            </div>
          ) : viewMode === 'tree' ? (
            <TreeView
              className={classes.treeView}
              defaultCollapseIcon={<ExpandMoreIcon />}
              defaultExpandIcon={<ChevronRightIcon />}
              defaultExpanded={[]}
              onNodeToggle={(event: ChangeEvent<{}>, nodeIds: string[]) => {
                console.log('Przełączono węzeł:', nodeIds);
              }}
            >
              {bookmarks.map((bookmark) => renderBookmarkTree(bookmark))}
            </TreeView>
          ) : (
            <pre className={classes.jsonView}>
              {JSON.stringify(bookmarks, null, 2)}
            </pre>
          )}
        </Paper>
      </Container>
    </div>
  );
}; 