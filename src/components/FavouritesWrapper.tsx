import React, { useState } from 'react';
import {
  makeStyles,
  TextField,
  Typography,
  Grid,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Button
} from '@material-ui/core';

const useStyles = makeStyles((theme) => ({
  root: {
    padding: theme.spacing(3),
  },
  header: {
    marginBottom: theme.spacing(3),
  },
  search: {
    marginBottom: theme.spacing(4),
  },
  card: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  cardMedia: {
    paddingTop: '56.25%', // 16:9
  },
  cardContent: {
    flexGrow: 1,
  },
  price: {
    marginTop: theme.spacing(1),
    color: theme.palette.primary.main,
  },
}));

interface FavouriteItem {
  id: string;
  title: string;
  price: number;
  imageUrl: string;
  url: string;
}

interface FavouritesWrapperProps {
  favourites: FavouriteItem[];
  onRemove: (id: string) => Promise<void>;
}

export const FavouritesWrapper: React.FC<FavouritesWrapperProps> = ({ 
  favourites, 
  onRemove 
}) => {
  const classes = useStyles();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFavourites = favourites.filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={classes.root}>
      <div className={classes.header}>
        <Typography variant="h4" gutterBottom>
          Twoje ulubione produkty
        </Typography>
        <TextField
          className={classes.search}
          fullWidth
          variant="outlined"
          label="Szukaj w ulubionych..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <Grid container spacing={4}>
        {filteredFavourites.map((item) => (
          <Grid item key={item.id} xs={12} sm={6} md={4}>
            <Card className={classes.card}>
              <CardMedia
                className={classes.cardMedia}
                image={item.imageUrl}
                title={item.title}
              />
              <CardContent className={classes.cardContent}>
                <Typography gutterBottom variant="h6" component="h2">
                  {item.title}
                </Typography>
                <Typography variant="h6" className={classes.price}>
                  {item.price} zł
                </Typography>
              </CardContent>
              <CardActions>
                <Button 
                  size="small" 
                  color="primary"
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Zobacz na Allegro
                </Button>
                <Button 
                  size="small" 
                  color="secondary"
                  onClick={() => onRemove(item.id)}
                >
                  Usuń z ulubionych
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {filteredFavourites.length === 0 && (
        <Typography variant="body1" align="center">
          {searchQuery
            ? 'Nie znaleziono produktów pasujących do wyszukiwania'
            : 'Nie masz jeszcze żadnych ulubionych produktów'}
        </Typography>
      )}
    </div>
  );
};