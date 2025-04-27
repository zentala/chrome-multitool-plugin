import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Chip,
  Box,
  Autocomplete
} from '@mui/material';
import { BookmarkExtendedData, FolderExtendedData } from '../types/storage.types';

interface EditDataDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<BookmarkExtendedData | FolderExtendedData>) => void;
  initialData: Partial<BookmarkExtendedData | FolderExtendedData>;
  isFolder: boolean;
}

export const EditDataDialog: React.FC<EditDataDialogProps> = ({
  open,
  onClose,
  onSave,
  initialData,
  isFolder
}) => {
  const [data, setData] = useState<Partial<BookmarkExtendedData | FolderExtendedData>>(
    () => ({...initialData})
  );

  useEffect(() => {
    setData({...initialData});
  }, [initialData]);

  const handleSave = () => {
    const dataToSave = {
      ...data,
      description: data.description || '',
      tags: data.tags || [],
      lastModified: Date.now(),
      ...(isFolder ? { purpose: (data as FolderExtendedData).purpose || '' } : 
                    { excerpt: (data as BookmarkExtendedData).excerpt || '' })
    };
    onSave(dataToSave);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edytuj dane {isFolder ? 'folderu' : 'zakładki'}</DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          label="Opis"
          multiline
          rows={3}
          value={data.description || ''}
          onChange={(e) => setData({ ...data, description: e.target.value })}
          margin="normal"
        />
        
        {isFolder ? (
          <TextField
            fullWidth
            label="Przeznaczenie"
            multiline
            rows={2}
            value={(data as FolderExtendedData).purpose || ''}
            onChange={(e) => setData({ ...data, purpose: e.target.value })}
            margin="normal"
          />
        ) : (
          <TextField
            fullWidth
            label="Streszczenie"
            multiline
            rows={2}
            value={(data as BookmarkExtendedData).excerpt || ''}
            onChange={(e) => setData({ ...data, excerpt: e.target.value })}
            margin="normal"
          />
        )}

        <Box sx={{ mt: 2 }}>
          <Autocomplete
            multiple
            freeSolo
            options={[]}
            value={data.tags || []}
            onChange={(_, newValue) => {
              setData(prev => ({
                ...prev,
                tags: newValue.map(tag => typeof tag === 'string' ? tag.trim() : tag).filter(Boolean)
              }));
            }}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  variant="outlined"
                  label={option}
                  {...getTagProps({ index })}
                  key={option}
                />
              ))
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label="Tagi"
                placeholder="Wpisz tag i naciśnij Enter"
                variant="outlined"
              />
            )}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Anuluj</Button>
        <Button onClick={handleSave} variant="contained">Zapisz</Button>
      </DialogActions>
    </Dialog>
  );
}; 