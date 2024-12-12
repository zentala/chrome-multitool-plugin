import React, { useState } from 'react';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Box,
  Chip,
  Paper,
  Grid,
  LinearProgress,
  Button,
  Stack
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CodeIcon from '@mui/icons-material/Code';
import StorageIcon from '@mui/icons-material/Storage';
import FolderIcon from '@mui/icons-material/Folder';
import DownloadIcon from '@mui/icons-material/Download';
import BugReportIcon from '@mui/icons-material/BugReport';

interface DebugInfo {
  isInitialized: boolean;
  provider: string;
  embeddingsStatus: boolean;
  vectorStoreStatus: boolean;
  documentsCount: number;
  sampleDocuments: any[];
  folderStructure: Record<string, any>;
}

interface DebugPanelProps {
  debugInfo: DebugInfo;
  onClose?: () => void;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({ debugInfo, onClose }) => {
  const [expanded, setExpanded] = useState<string | false>('status');

  const handleChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded ? panel : false);
  };

  const handleExportDebugData = () => {
    const debugData = {
      timestamp: new Date().toISOString(),
      ...debugInfo
    };

    const blob = new Blob([JSON.stringify(debugData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debug-data-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const StatusChip = ({ status, label }: { status: boolean; label?: string }) => (
    <Chip 
      label={label || (status ? "OK" : "Błąd")} 
      color={status ? "success" : "error"} 
      size="small" 
      sx={{ ml: 1 }}
    />
  );

  return (
    <Paper sx={{ p: 2, mb: 2, position: 'relative' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
          <BugReportIcon sx={{ mr: 1 }} />
          Panel Debugowania
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            startIcon={<DownloadIcon />}
            onClick={handleExportDebugData}
            variant="outlined"
          >
            Eksportuj
          </Button>
          {onClose && (
            <Button
              size="small"
              onClick={onClose}
              variant="outlined"
              color="secondary"
            >
              Zamknij
            </Button>
          )}
        </Stack>
      </Box>

      <Accordion expanded={expanded === 'status'} onChange={handleChange('status')}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography sx={{ display: 'flex', alignItems: 'center' }}>
            <CodeIcon sx={{ mr: 1 }} />
            Status Systemu
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Status Inicjalizacji
                  <StatusChip status={debugInfo.isInitialized} />
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={debugInfo.isInitialized ? 100 : 0} 
                  sx={{ mt: 1 }}
                />
              </Box>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="subtitle2">
                Provider: <Chip label={debugInfo.provider} size="small" color="primary" />
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="subtitle2">
                Liczba dokumentów: <Chip label={debugInfo.documentsCount} size="small" />
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="subtitle2">
                Status Embeddings
                <StatusChip status={debugInfo.embeddingsStatus} />
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="subtitle2">
                Status VectorStore
                <StatusChip status={debugInfo.vectorStoreStatus} />
              </Typography>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      <Accordion expanded={expanded === 'documents'} onChange={handleChange('documents')}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography sx={{ display: 'flex', alignItems: 'center' }}>
            <StorageIcon sx={{ mr: 1 }} />
            Przykładowe Dokumenty ({debugInfo.sampleDocuments.length})
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
            {debugInfo.sampleDocuments.map((doc, index) => (
              <Paper key={index} sx={{ p: 1, mb: 1, bgcolor: 'grey.100' }}>
                <Typography variant="subtitle2">{doc.title}</Typography>
                <Typography variant="caption" display="block" color="text.secondary">
                  URL: {doc.url}
                </Typography>
                <Typography variant="caption" display="block" color="text.secondary">
                  Ścieżka: {doc.folderPath}
                </Typography>
                {doc.tags && doc.tags.length > 0 && (
                  <Box sx={{ mt: 0.5 }}>
                    {doc.tags.map((tag: string, tagIndex: number) => (
                      <Chip 
                        key={tagIndex} 
                        label={tag} 
                        size="small" 
                        sx={{ mr: 0.5, mb: 0.5 }} 
                        variant="outlined"
                      />
                    ))}
                  </Box>
                )}
              </Paper>
            ))}
          </Box>
        </AccordionDetails>
      </Accordion>

      <Accordion expanded={expanded === 'folders'} onChange={handleChange('folders')}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography sx={{ display: 'flex', alignItems: 'center' }}>
            <FolderIcon sx={{ mr: 1 }} />
            Struktura Folderów
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box 
            component="pre"
            sx={{ 
              maxHeight: 300, 
              overflow: 'auto',
              bgcolor: 'grey.100',
              p: 2,
              borderRadius: 1,
              fontSize: '0.875rem',
              '&::-webkit-scrollbar': {
                width: '8px',
                height: '8px',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: 'rgba(0,0,0,.2)',
                borderRadius: '4px',
              },
            }}
          >
            {JSON.stringify(debugInfo.folderStructure, null, 2)}
          </Box>
        </AccordionDetails>
      </Accordion>
    </Paper>
  );
};
