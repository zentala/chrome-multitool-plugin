import React, { useState } from 'react';
import { Product } from '../types/Product';
import { ProductCard } from './FavouriteProductCard';

interface FavouritesWrapperProps {
  favourites: Product[];
  onRemove: (id: string) => void;
}

export const FavouritesWrapper: React.FC<FavouritesWrapperProps> = ({ favourites, onRemove }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFavourites = favourites.filter(fav => 
    fav.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="favourites-wrapper">
      <div className="favourites-header">
        <h2 className="mp0t_ji m9qz_yo">Twoje ulubione produkty</h2>
        <input
          type="search"
          placeholder="Szukaj w ulubionych..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="favourites-search"
        />
      </div>
      
      {filteredFavourites.length === 0 ? (
        <p className="mgn2_14">
          {searchQuery ? 'Nie znaleziono produktów' : 'Nie masz jeszcze żadnych ulubionych produkt��w.'}
        </p>
      ) : (
        <div className="favourites-grid">
          {filteredFavourites.map(favourite => (
            <ProductCard
              key={favourite.id}
              product={favourite}
              onRemove={onRemove}
            />
          ))}
        </div>
      )}
    </div>
  );
}; 