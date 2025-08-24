/**
 * Module List Component
 * Displays all available modules in a modular popup design
 */

// Purpose: This component creates the new modular popup structure where each
// feature has a main button and settings gear icon

import React, { useState } from 'react';
import { makeStyles } from '@mui/styles';
import { Theme } from '@mui/material/styles';
import {
  Typography,
  Box,
  IconButton,
  Grid,
  Paper,
  Divider,
  Chip,
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import BookmarksIcon from '@mui/icons-material/Bookmarks';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import CurrencyExchangeIcon from '@mui/icons-material/CurrencyExchange';
import YouTubeIcon from '@mui/icons-material/YouTube';
import { CurrencyConverter } from '../CurrencyConverter/CurrencyConverter';
import CurrencyConverterSettings from '../CurrencyConverter/CurrencyConverterSettings';
import YouTubeModule from '../YouTube/YouTubeModule';
import YouTubeSettings from '../YouTube/YouTubeSettings';


const useStyles = makeStyles((theme: Theme) => ({
  root: {
    minWidth: 400,
    maxWidth: 600,
    padding: theme.spacing(2),
    backgroundColor: theme.palette.background.default,
  },
  header: {
    marginBottom: theme.spacing(2),
  },
  title: {
    fontWeight: 600,
    color: theme.palette.primary.main,
  },
  subtitle: {
    color: theme.palette.text.secondary,
    fontSize: '0.875rem',
  },
  modulesGrid: {
    marginBottom: theme.spacing(2),
  },
  moduleCard: {
    padding: theme.spacing(2),
    cursor: 'pointer',
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.spacing(1),
    transition: 'all 0.2s ease-in-out',
    '&:hover': {
      borderColor: theme.palette.primary.main,
      backgroundColor: theme.palette.action.hover,
    },
  },
  moduleHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing(1),
  },
  moduleInfo: {
    display: 'flex',
    alignItems: 'center',
    flex: 1,
  },
  moduleIcon: {
    marginRight: theme.spacing(1),
    color: theme.palette.primary.main,
  },
  moduleTitle: {
    fontWeight: 500,
    marginBottom: theme.spacing(0.5),
  },
  moduleDescription: {
    fontSize: '0.75rem',
    color: theme.palette.text.secondary,
  },
  settingsButton: {
    color: theme.palette.text.secondary,
    '&:hover': {
      color: theme.palette.primary.main,
    },
  },
  activeModule: {
    borderColor: theme.palette.primary.main,
    backgroundColor: theme.palette.action.selected,
  },
  moduleContent: {
    marginTop: theme.spacing(2),
  },
  statusChip: {
    fontSize: '0.7rem',
    height: '20px',
  },
}));

interface Module {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  component: React.ComponentType;
  settingsComponent: React.ComponentType;
  enabled: boolean;
  hasSettings: boolean;
}

export const ModuleList: React.FC = () => {
  const classes = useStyles();
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState<string | null>(null);


  // Available modules
  const modules: Module[] = [
    {
      id: 'bookmarks',
      name: 'Bookmark Manager',
      description: 'AI-powered bookmark organization and search',
      icon: <BookmarksIcon />,
      component: () => <div>Bookmark Manager Component</div>, // Placeholder
      settingsComponent: () => <div>Bookmark Settings</div>, // Placeholder
      enabled: true,
      hasSettings: true,
    },
    {
      id: 'allegro',
      name: 'Allegro Favourites',
      description: 'Track your Allegro favourite items',
      icon: <ShoppingCartIcon />,
      component: () => <div>Allegro Favourites Component</div>, // Placeholder
      settingsComponent: () => <div>Allegro Settings</div>, // Placeholder
      enabled: true,
      hasSettings: true,
    },
    {
      id: 'currency',
      name: 'Currency Converter',
      description: 'Convert currencies with AI assistance',
      icon: <CurrencyExchangeIcon />,
      component: CurrencyConverter,
      settingsComponent: CurrencyConverterSettings,
      enabled: true,
      hasSettings: true,
    },
    {
      id: 'youtube',
      name: 'YouTube AI',
      description: 'AI-powered YouTube transcription and analysis',
      icon: <YouTubeIcon />,
      component: YouTubeModule,
      settingsComponent: YouTubeSettings,
      enabled: true,
      hasSettings: true,
    },
  ];

  // Handle module click
  const handleModuleClick = (moduleId: string) => {
    if (activeModule === moduleId) {
      setActiveModule(null);
    } else {
      setActiveModule(moduleId);
      setShowSettings(null);
    }
  };

  // Handle settings click
  const handleSettingsClick = (moduleId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setShowSettings(showSettings === moduleId ? null : moduleId);
    setActiveModule(null);
  };



  // Open module in new tab (for legacy modules)
  const openModuleInTab = (moduleId: string) => {
    let url = '';
    switch (moduleId) {
      case 'bookmarks':
        url = chrome.runtime.getURL('bookmarkManager.html');
        break;
      case 'allegro':
        url = chrome.runtime.getURL('favouritesAllegro.html');
        break;
    }

    if (url) {
      chrome.tabs.create({ url });
    }
  };

  // Render active module content
  const renderActiveModule = () => {
    if (!activeModule) return null;

    const module = modules.find(m => m.id === activeModule);
    if (!module) return null;

    // Special handling for legacy modules that open in new tabs
    if (['bookmarks', 'allegro'].includes(activeModule)) {
      setTimeout(() => openModuleInTab(activeModule), 100);
      return (
        <Box className={classes.moduleContent}>
          <Typography variant="body2" color="textSecondary">
            Opening {module.name} in new tab...
          </Typography>
        </Box>
      );
    }

    const ModuleComponent = module.component;
    return (
      <Box className={classes.moduleContent}>
        <Divider sx={{ marginBottom: 2 }} />
        <ModuleComponent />
      </Box>
    );
  };

  // Render settings content
  const renderSettings = () => {
    if (!showSettings) return null;

    const module = modules.find(m => m.id === showSettings);
    if (!module || !module.hasSettings) return null;

    const SettingsComponent = module.settingsComponent;
    return (
      <Box className={classes.moduleContent}>
        <Divider sx={{ marginBottom: 2 }} />
        <Typography variant="h6" gutterBottom>
          {module.name} Settings
        </Typography>
        <SettingsComponent />
      </Box>
    );
  };

  return (
    <Box className={classes.root}>
      <Box className={classes.header}>
        <Typography variant="h5" className={classes.title}>
          Zentala Multitool
        </Typography>
        <Typography variant="body2" className={classes.subtitle}>
          Modular productivity tools and AI integrations
        </Typography>
      </Box>

      <Grid container spacing={2} className={classes.modulesGrid}>
        {modules.map((module) => (
          <Grid item xs={6} key={module.id}>
            <Paper
              className={`${classes.moduleCard} ${activeModule === module.id ? classes.activeModule : ''}`}
              onClick={() => handleModuleClick(module.id)}
            >
              <Box className={classes.moduleHeader}>
                <Box className={classes.moduleInfo}>
                  <Box className={classes.moduleIcon}>
                    {module.icon}
                  </Box>
                  <Box>
                    <Typography variant="subtitle1" className={classes.moduleTitle}>
                      {module.name}
                    </Typography>
                    <Typography variant="body2" className={classes.moduleDescription}>
                      {module.description}
                    </Typography>
                  </Box>
                </Box>
                {module.hasSettings && (
                  <IconButton
                    size="small"
                    className={classes.settingsButton}
                    onClick={(e) => handleSettingsClick(module.id, e)}
                    title={`Settings for ${module.name}`}
                  >
                    <SettingsIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Chip
                  label={module.enabled ? 'Active' : 'Disabled'}
                  color={module.enabled ? 'success' : 'default'}
                  size="small"
                  className={classes.statusChip}
                />
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {renderActiveModule()}
      {renderSettings()}
    </Box>
  );
};
