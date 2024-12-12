import React, { useState } from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Typography from '@mui/material/Typography';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { BookmarkEntity } from '../types/bookmarks.types';

interface EmbeddingsConfirmDialogProps {
  open: boolean;
  bookmarksToProcess: BookmarkEntity[];
  onClose: () => void;
  onConfirm: () => void;
}

export const EmbeddingsConfirmDialog: React.FC<EmbeddingsConfirmDialogProps> = ({
  open,
  bookmarksToProcess,
  onClose,
  onConfirm
}) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
      maxWidth="md"
      fullWidth
    >
      <DialogTitle id="alert-dialog-title">
        Potwierdź generowanie embeddingów
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="alert-dialog-description">
          Znaleziono {bookmarksToProcess.length} zakładek do przetworzenia. 
          Czy chcesz wygenerować dla nich embeddingi?
        </DialogContentText>

        <Accordion 
          expanded={expanded} 
          onChange={() => setExpanded(!expanded)}
          sx={{ mt: 2 }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>
              Pokaż szczegóły ({bookmarksToProcess.length} zakładek)
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <div style={{ maxHeight: '300px', overflow: 'auto' }}>
              {bookmarksToProcess.map((bookmark, index) => (
                <div key={bookmark.id} style={{ marginBottom: '8px' }}>
                  <Typography variant="body2" component="div">
                    <strong>{index + 1}.</strong> {bookmark.title}
                    <br />
                    <small style={{ color: 'gray' }}>
                      {bookmark.url}
                      {bookmark.metadata?.folderPath && (
                        <><br />Folder: {bookmark.metadata.folderPath}</>
                      )}
                    </small>
                  </Typography>
                </div>
              ))}
            </div>
          </AccordionDetails>
        </Accordion>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          Anuluj
        </Button>
        <Button onClick={onConfirm} color="primary" autoFocus variant="contained">
          Generuj embeddingi
        </Button>
      </DialogActions>
    </Dialog>
  );
}; 