import React, { useEffect, useState } from 'react';
import { FavouritesWrapper } from './components/FavouritesWrapper';
import { storageService } from '../../services/storage.service';
import { AllegroFavourite } from './types';

export function FavouritesAllegroApp() {
  const [favourites, setFavourites] = useState<AllegroFavourite[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Pobieramy dane z chrome.storage
  const fetchFavourites = async () => {
    try {
      setIsLoading(true);
      const favs = await storageService.getAll<AllegroFavourite>();
      setFavourites(favs);
    } catch (error) {
      console.error('Error fetching Allegro favourites:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Wczytujemy dane przy montowaniu komponentu
  useEffect(() => {
    fetchFavourites();
  }, []);

  // Usuwanie itemu po ID i ponowne wczytanie listy
  const handleRemove = async (id: string) => {
    try {
      await storageService.removeFromFavourites(id);
      await fetchFavourites();
    } catch (error) {
      console.error('Error removing favourite:', error);
    }
  };

  // Renderujemy wczytywanie lub listę
  return (
    <div style={{ padding: '16px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ marginBottom: '16px' }}>Allegro Favourites</h1>
      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <FavouritesWrapper favourites={favourites} onRemove={handleRemove} />
      )}
    </div>
  );
}