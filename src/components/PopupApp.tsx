import React from 'react';
import { 
  makeStyles,
  Typography,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@material-ui/core';
import BookmarksIcon from '@material-ui/icons/Bookmarks';
import TestToggleButton from './TestToggleButton';

const useStyles = makeStyles((theme) => ({
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
          button 
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