export interface Product {
  id: string;
  name: string;
  url: string;
  price: number;
  category: string;
  addedAt: string;
  imageUrl?: string;
  description?: string;
  isWatched?: boolean;
} 
