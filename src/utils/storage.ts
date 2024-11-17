import { Product } from "types/Product";

export const storage = {
  async saveProduct(product: Product) {
    return chrome.storage.local.set({
      [`product_${product.id}`]: product
    });
  },

  async getProducts(): Promise<Product[]> {
    const result = await chrome.storage.local.get(null);
    return Object.values(result).filter(item => 
      (item as Product).id !== undefined
    ) as Product[];
  },

  async getProductsByCategory(category: string): Promise<Product[]> {
    const products = await this.getProducts();
    return products.filter(p => p.category === category);
  }
}; 