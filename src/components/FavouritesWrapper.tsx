import React, { useState } from 'react';
import './FavouritesWrapper.scss';

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

export const FavouritesWrapper: React.FC<FavouritesWrapperProps> = ({ favourites, onRemove }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFavourites = favourites.filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="favourites-wrapper">
      <div className="favourites-header">
        <h2>Twoje ulubione produkty</h2>
        <input
          type="text"
          className="favourites-search"
          placeholder="Szukaj w ulubionych..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      
      <div className="favourites-grid">
        {filteredFavourites.map((item) => (
          <div key={item.id} className="favourite-item">
            <img src={item.imageUrl} alt={item.title} />
            <h3>{item.title}</h3>
            <p>{item.price} zł</p>
            <div className="actions">
              <a href={item.url} target="_blank" rel="noopener noreferrer">
                Zobacz na Allegro
              </a>
              <button onClick={() => onRemove(item.id)}>
                Usuń z ulubionych
              </button>
            </div>
          </div>
        ))}
      </div>
      
      {filteredFavourites.length === 0 && (
        <p>
          {searchQuery
            ? 'Nie znaleziono produktów pasujących do wyszukiwania'
            : 'Nie masz jeszcze żadnych ulubionych produktów'}
        </p>
      )}
    </div>
  );
};