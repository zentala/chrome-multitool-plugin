import * as React from 'react';
import { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  TextField,
  Button,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  CircularProgress,
  Alert
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import SearchIcon from '@mui/icons-material/Search';
import { vectorStoreService, SimilaritySearchResult, BookmarkEntity } from '../../services/vectorStore';
import { Theme } from '@mui/material/styles';
import { makeStyles } from '@mui/styles';

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
    backgroundColor: '#f5f5f5',
  },
  container: {
    marginTop: theme.spacing(4),
    maxWidth: '100%',
  },
  searchContainer: {
    padding: theme.spacing(3),
    marginBottom: theme.spacing(3),
  },
  searchForm: {
    display: 'flex',
    gap: theme.spacing(2),
    alignItems: 'center',
    marginBottom: theme.spacing(2),
  },
  searchInput: {
    flexGrow: 1,
  },
  resultsContainer: {
    padding: theme.spacing(3),
  },
  resultItem: {
    marginBottom: theme.spacing(2),
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    padding: theme.spacing(4),
  },
  errorContainer: {
    padding: theme.spacing(3),
  },
}));

/**
 * Interface for search results from vector store
 */
interface SearchResult {
  bookmark: {
    id: string;
    title: string;
    url: string;
    content: string;
    category?: string;
  };
  score: number;
}

/**
 * The main application component for managing and searching bookmarks using vector search.
 * It provides a search interface to find bookmarks using semantic similarity.
 *
 * @component
 * @example
 * return (
 *   <BookmarkManagerApp />
 * )
 */
export const BookmarkManagerApp: React.FC = () => {
  const classes = useStyles();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);


  /**
   * Handles the search functionality
   */
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      // Use the existing similaritySearch method from vectorStoreService
      const results = await vectorStoreService.similaritySearch(searchQuery.trim(), 10);

      // Transform results to match expected format
      const formattedResults: SearchResult[] = results.map((result: SimilaritySearchResult) => ({
        bookmark: {
          id: result.metadata.bookmarkId,
          title: result.metadata.title,
          url: result.metadata.url || '',
          content: result.pageContent,
          category: result.metadata.folderPath || 'Uncategorized'
        },
        score: 0.95 // Placeholder score since the original method doesn't return scores in the same format
      }));

      setSearchResults(formattedResults);
    } catch (err) {
      console.error('Search error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during search');
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handles Enter key press in search input
   */
  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  /**
   * Opens a bookmark URL in a new tab
   */
  const handleBookmarkClick = (url: string) => {
    chrome.tabs.create({ url });
  };

  return (
    <div className={classes.root}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 400 }}>
            Bookmark Manager
          </Typography>
          <IconButton color="inherit" onClick={() => {/* Settings functionality can be added later */}}>
            <SettingsIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box className={classes.container}>
        <Paper className={classes.searchContainer}>
          <div className={classes.searchForm}>
            <TextField
              className={classes.searchInput}
              label="Search bookmarks"
              variant="outlined"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter your search query..."
            />
            <Button
              variant="contained"
              color="primary"
              startIcon={<SearchIcon />}
              onClick={handleSearch}
              disabled={isLoading || !searchQuery.trim()}
            >
              {isLoading ? 'Searching...' : 'Search'}
            </Button>
          </div>
        </Paper>

        {error && (
          <Box className={classes.errorContainer}>
            <Alert severity="error">{error}</Alert>
          </Box>
        )}

        {isLoading && (
          <Box className={classes.loadingContainer}>
            <CircularProgress />
            <Typography variant="body1" sx={{ ml: 2 }}>
              Searching bookmarks...
            </Typography>
          </Box>
        )}

        {!isLoading && searchResults.length > 0 && (
          <Paper className={classes.resultsContainer}>
            <Typography variant="h6" gutterBottom>
              Search Results ({searchResults.length})
            </Typography>
            <List>
              {searchResults.map((result, index) => (
                <ListItem key={result.bookmark.id} className={classes.resultItem}>
                  <ListItemButton onClick={() => handleBookmarkClick(result.bookmark.url)}>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="subtitle1" component="span">
                            {result.bookmark.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" component="span">
                            {Math.round(result.score * 100)}%
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="primary" sx={{ mb: 1 }}>
                            {result.bookmark.url}
                          </Typography>
                          {result.bookmark.content && (
                            <Typography variant="body2" color="text.secondary" noWrap>
                              {result.bookmark.content.length > 200
                                ? `${result.bookmark.content.substring(0, 200)}...`
                                : result.bookmark.content}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Paper>
        )}

        {!isLoading && searchQuery && searchResults.length === 0 && !error && (
          <Paper className={classes.resultsContainer}>
            <Typography variant="body1" color="text.secondary">
              No bookmarks found matching your search.
            </Typography>
          </Paper>
        )}
      </Box>
    </div>
  );
};
