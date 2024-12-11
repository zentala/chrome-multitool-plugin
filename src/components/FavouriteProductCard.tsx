import React from 'react';
import { Product } from '../types/Product';

interface ProductCardProps {
  product: Product;
  onRemove: (id: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onRemove }) => {
  return (
    <div className="favourite-item">
      <img src={product.thumbnailUrl} alt={product.name} />
      <h3>{product.name}</h3>
      <p>Cena: {product.price}</p>
      <div className="favourite-item-actions">
        <a href={product.url} target="_blank" rel="noopener noreferrer">
          Zobacz na Allegro
        </a>
        <button 
          className="remove-favourite" 
          onClick={() => onRemove(product.id)}
        >
          Usuń z ulubionych
        </button>
      </div>
    </div>
  );
}; 