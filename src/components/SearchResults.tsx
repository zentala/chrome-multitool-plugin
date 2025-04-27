import React from 'react';
import { Box, Card, CardContent, Typography, Link, Chip, Stack } from '@mui/material';
import { styled } from '@mui/material/styles';

export interface SearchResult {
  pageContent: string;
  metadata: {
    bookmarkId: string;
    title: string;
    url: string;
    folderPath?: string;
    description?: string;
    tags?: string[];
    lastModified?: number;
  };
}

interface SearchResultsProps {
  results: SearchResult[];
}

const StyledCard = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  transition: 'transform 0.2s ease-in-out',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: theme.shadows[4],
  },
}));

const FolderPath = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary,
  fontSize: '0.85rem',
  marginBottom: theme.spacing(1),
}));

const Description = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary,
  marginTop: theme.spacing(1),
  marginBottom: theme.spacing(1),
}));

const TagsContainer = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(1),
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.spacing(0.5),
}));

export const SearchResults: React.FC<SearchResultsProps> = ({ results }) => {
  if (!results || results.length === 0) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography color="text.secondary">
          Nie znaleziono żadnych zakładek
        </Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={2}>
      {results.map((result, index) => (
        <StyledCard key={result.metadata.bookmarkId || index}>
          <CardContent>
            <Typography variant="h6" component="h2" gutterBottom>
              <Link 
                href={result.metadata.url} 
                target="_blank" 
                rel="noopener noreferrer"
                underline="hover"
                color="primary"
              >
                {result.metadata.title}
              </Link>
            </Typography>

            {result.metadata.folderPath && (
              <FolderPath>
                📁 {result.metadata.folderPath}
              </FolderPath>
            )}

            {result.metadata.description && (
              <Description>
                {result.metadata.description}
              </Description>
            )}

            <Box sx={{ mt: 1 }}>
              <Typography 
                variant="body2" 
                color="text.secondary" 
                component="div"
                sx={{ 
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                🔗 {result.metadata.url}
              </Typography>
            </Box>

            {result.metadata.tags && result.metadata.tags.length > 0 && (
              <TagsContainer>
                {result.metadata.tags.map((tag, tagIndex) => (
                  <Chip
                    key={tagIndex}
                    label={tag}
                    size="small"
                    variant="outlined"
                    sx={{ mr: 0.5 }}
                  />
                ))}
              </TagsContainer>
            )}

            {result.metadata.lastModified && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Ostatnia modyfikacja: {new Date(result.metadata.lastModified).toLocaleString()}
              </Typography>
            )}
          </CardContent>
        </StyledCard>
      ))}
    </Stack>
  );
}; 