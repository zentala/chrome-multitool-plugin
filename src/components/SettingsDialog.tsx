import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  IconButton,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { settingsService } from '../services/settings.service';

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({ open, onClose }) => {
  const [openaiKey, setOpenaiKey] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('openai');
  const [showKeys, setShowKeys] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      const oaiKey = await settingsService.getSetting('openai_api_key');
      const antKey = await settingsService.getSetting('anthropic_api_key');
      const provider = await settingsService.getSetting('selected_provider') || 'openai';
      
      if (oaiKey) setOpenaiKey(oaiKey);
      if (antKey) setAnthropicKey(antKey);
      setSelectedProvider(provider);
    };
    loadSettings();
  }, [open]);

  const handleSave = async () => {
    await settingsService.saveSetting('openai_api_key', openaiKey);
    await settingsService.saveSetting('anthropic_api_key', anthropicKey);
    await settingsService.saveSetting('selected_provider', selectedProvider);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Ustawienia</DialogTitle>
      <DialogContent>
        <FormControl fullWidth margin="normal">
          <InputLabel>Dostawca AI</InputLabel>
          <Select
            value={selectedProvider}
            label="Dostawca AI"
            onChange={(e) => setSelectedProvider(e.target.value)}
          >
            <MenuItem value="openai">OpenAI</MenuItem>
            <MenuItem value="anthropic">Anthropic</MenuItem>
          </Select>
        </FormControl>

        <TextField
          fullWidth
          margin="normal"
          label="OpenAI API Key"
          type={showKeys ? 'text' : 'password'}
          value={openaiKey}
          onChange={(e) => setOpenaiKey(e.target.value)}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={() => setShowKeys(!showKeys)} edge="end">
                  {showKeys ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        <TextField
          fullWidth
          margin="normal"
          label="Anthropic API Key"
          type={showKeys ? 'text' : 'password'}
          value={anthropicKey}
          onChange={(e) => setAnthropicKey(e.target.value)}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={() => setShowKeys(!showKeys)} edge="end">
                  {showKeys ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Anuluj</Button>
        <Button onClick={handleSave} variant="contained">
          Zapisz
        </Button>
      </DialogActions>
    </Dialog>
  );
}; 