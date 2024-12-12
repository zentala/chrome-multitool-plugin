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
  MenuItem,
  FormControlLabel,
  Switch,
  Typography,
  SelectChangeEvent
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { settingsService } from '../services/settings.service';
import { vectorStoreService } from '../services/vectorStore.service';

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({ open, onClose }) => {
  const [openaiKey, setOpenaiKey] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('openai');
  const [showKeys, setShowKeys] = useState(false);
  const [debugMode, setDebugMode] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      const oaiKey = await settingsService.getSetting('openai_api_key');
      const antKey = await settingsService.getSetting('anthropic_api_key');
      const provider = await settingsService.getSetting('selected_provider') || 'openai';
      const savedDebugMode = await settingsService.getSetting('debug_mode');
      
      if (oaiKey) setOpenaiKey(oaiKey);
      if (antKey) setAnthropicKey(antKey);
      setSelectedProvider(provider);
      setDebugMode(savedDebugMode === 'true');
      vectorStoreService.setDebugMode(savedDebugMode === 'true');
    };
    loadSettings();
  }, [open]);

  const handleProviderChange = async (event: SelectChangeEvent) => {
    const value = event.target.value;
    setSelectedProvider(value);
    await settingsService.saveSetting('selected_provider', value);
  };

  const handleOpenAIKeyChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setOpenaiKey(value);
    await settingsService.saveSetting('openai_api_key', value);
  };

  const handleAnthropicKeyChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setAnthropicKey(value);
    await settingsService.saveSetting('anthropic_api_key', value);
  };

  const handleDebugModeChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.checked;
    setDebugMode(newValue);
    await settingsService.saveSetting('debug_mode', String(newValue));
    vectorStoreService.setDebugMode(newValue);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Ustawienia</DialogTitle>
      <DialogContent>
        <FormControlLabel
          control={
            <Switch
              checked={debugMode}
              onChange={handleDebugModeChange}
              name="debugMode"
            />
          }
          label="Tryb debugowania (limit 5 zakładek)"
        />
        <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: -1, ml: 1 }}>
          Ogranicza przetwarzanie do pierwszych 5 zakładek dla celów testowych
        </Typography>

        <InputLabel id="provider-label">Dostawca AI</InputLabel>
        <Select
          labelId="provider-label"
          value={selectedProvider}
          label="Dostawca AI"
          onChange={handleProviderChange}
          fullWidth
          margin="dense"
        >
          <MenuItem value="openai">OpenAI</MenuItem>
          <MenuItem value="anthropic">Anthropic</MenuItem>
        </Select>

        <TextField
          margin="dense"
          label="Klucz API OpenAI"
          type={showKeys ? 'text' : 'password'}
          fullWidth
          value={openaiKey}
          onChange={handleOpenAIKeyChange}
          InputProps={{
            endAdornment: (
              <IconButton
                aria-label="toggle key visibility"
                onClick={() => setShowKeys(!showKeys)}
                edge="end"
              >
                {showKeys ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            ),
          }}
        />

        <TextField
          margin="dense"
          label="Klucz API Anthropic"
          type={showKeys ? 'text' : 'password'}
          fullWidth
          value={anthropicKey}
          onChange={handleAnthropicKeyChange}
          InputProps={{
            endAdornment: (
              <IconButton
                aria-label="toggle key visibility"
                onClick={() => setShowKeys(!showKeys)}
                edge="end"
              >
                {showKeys ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            ),
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Zamknij</Button>
      </DialogActions>
    </Dialog>
  );
}; 