import React from 'react';
import { 
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import BookmarksIcon from '@mui/icons-material/Bookmarks';
import TestToggleButton from './TestToggleButton';
import { makeStyles } from '@mui/styles';
import { Theme } from '@mui/material/styles';

const useStyles = makeStyles((theme: Theme) => ({
  root: {
    minWidth: 300,
    padding: theme.spacing(2),
  },
  title: {
    marginBottom: theme.spacing(1),
  },
  subtitle: {
    color: theme.palette.text.secondary,
    marginBottom: theme.spacing(2),
  },
  list: {
    marginTop: theme.spacing(2),
  },
  listItem: {
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
  },
}));

export const PopupApp: React.FC = () => {
  const classes = useStyles();

  const openBookmarkManager = () => {
    chrome.tabs.create({
      url: chrome.runtime.getURL('bookmarkManager.html')
    });
  };

  return (
    <div className={classes.root}>
      <Typography variant="h5" component="h1" className={classes.title}>
        Zentala Chrome Multitool
      </Typography>
      <Typography variant="body2" className={classes.subtitle}>
        Custom shortcuts, automations, integrations and productivity tools
      </Typography>
      <List className={classes.list}>
        <ListItem 
          component="li"
          className={classes.listItem}
          onClick={openBookmarkManager}
        >
          <ListItemIcon>
            <BookmarksIcon />
          </ListItemIcon>
          <ListItemText primary="Bookmark Manager" />
        </ListItem>
      </List>
      <TestToggleButton />
    </div>
  );
}; 