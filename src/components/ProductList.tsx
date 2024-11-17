import React, { useEffect, useState } from 'react';
import { storage } from '../utils/storage';
import { Product } from '../types/Product';

export const ProductList: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    const loadProducts = async () => {
      const items = await storage.getProducts();
      setProducts(items);
      setCategories([...new Set(items.map(p => p.category))]);
    };
    loadProducts();
  }, []);

  return (
    <div className="product-list">
      <div className="categories">
        {categories.map(cat => (
          <button 
            key={cat}
            onClick={() => storage.getProductsByCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>
      
      <div className="products">
        {products.map(product => (
          <div key={product.id} className="product-card">
            <h3>{product.name}</h3>
            <p>Cena: {product.price} zł</p>
            <a href={product.url} target="_blank" rel="noopener">
              Zobacz na Allegro
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}; 