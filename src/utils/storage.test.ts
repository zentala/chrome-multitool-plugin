import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { storage } from './storage';
import { Product } from '../types/Product'; // Adjust path if needed

// Mock the chrome API dependency provided by setupTests.ts
// No need to explicitly mock chrome here as setupFiles does it globally via vi.stubGlobal

// Mock data
const mockProduct1: Product = {
  id: '1',
  name: 'Test Product 1',
  category: 'A',
  price: '10', // Price as string
  thumbnailUrl: 'http://example.com/thumb1.jpg',
  url: 'http://example.com/product1',
  addedAt: new Date().toISOString(),
};
const mockProduct2: Product = {
  id: '2',
  name: 'Test Product 2',
  category: 'B',
  price: '20',
  thumbnailUrl: 'http://example.com/thumb2.jpg',
  url: 'http://example.com/product2',
  addedAt: new Date().toISOString(),
};
const mockProduct3: Product = {
  id: '3',
  name: 'Test Product 3',
  category: 'A',
  price: '30',
  thumbnailUrl: 'http://example.com/thumb3.jpg',
  url: 'http://example.com/product3',
  addedAt: new Date().toISOString(),
};

describe('storage utility', () => {

  // Before each test, clear mocks to ensure test isolation
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mocks using more robust casting
    (chrome.storage.local.get as unknown as Mock).mockResolvedValue({});
    (chrome.storage.local.set as unknown as Mock).mockResolvedValue(undefined);
    // Reset any other mocks if necessary
  });

  describe('saveProduct', () => {
    it('should call chrome.storage.local.set with correct arguments', async () => {
      await storage.saveProduct(mockProduct1);

      // Verify that chrome.storage.local.set was called once
      expect(chrome.storage.local.set).toHaveBeenCalledTimes(1);

      // Verify it was called with the correct key-value pair
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        [`product_${mockProduct1.id}`]: mockProduct1,
      });
    });

    // Optional: Test potential error scenarios if saveProduct could throw errors
  });

  describe('getProducts', () => {
    it('should call chrome.storage.local.get with null', async () => {
      // Cast to vi.Mock to use mockResolvedValue
      (chrome.storage.local.get as unknown as Mock).mockResolvedValue({}); 
      await storage.getProducts();
      expect(chrome.storage.local.get).toHaveBeenCalledWith(null);
    });

    it('should return an empty array when storage is empty', async () => {
      (chrome.storage.local.get as unknown as Mock).mockResolvedValue({});
      const products = await storage.getProducts();
      expect(products).toEqual([]);
    });

    it('should return an array of products from storage', async () => {
      const storedData = {
        [`product_${mockProduct1.id}`]: mockProduct1,
        [`product_${mockProduct2.id}`]: mockProduct2,
      };
      (chrome.storage.local.get as unknown as Mock).mockResolvedValue(storedData);

      const products = await storage.getProducts();
      expect(products).toHaveLength(2);
      // Use expect.arrayContaining to check for presence regardless of order
      expect(products).toEqual(expect.arrayContaining([mockProduct1, mockProduct2]));
    });

    it('should filter out items that do not have an id property', async () => {
      const storedData = {
        [`product_${mockProduct1.id}`]: mockProduct1,
        someOtherData: { value: 'test' }, // Item without an id
        [`product_${mockProduct3.id}`]: mockProduct3,
      };
      (chrome.storage.local.get as unknown as Mock).mockResolvedValue(storedData);

      const products = await storage.getProducts();
      expect(products).toHaveLength(2);
      expect(products).toEqual(expect.arrayContaining([mockProduct1, mockProduct3]));
      // Ensure the non-product item is not included
      expect(products).not.toEqual(expect.arrayContaining([{ value: 'test' }]));
    });

    // Optional: Test error handling if chrome.storage.local.get rejects
  });

  describe('getProductsByCategory', () => {
    it('should call getProducts to fetch all products', async () => {
      // We can spy on the getProducts method of the *actual* storage object
      const getProductsSpy = vi.spyOn(storage, 'getProducts');
      // Mock the underlying storage call to avoid actual storage interaction
      (chrome.storage.local.get as unknown as Mock).mockResolvedValue({}); 

      await storage.getProductsByCategory('A');
      expect(getProductsSpy).toHaveBeenCalledTimes(1);

      // Restore the original implementation after the test
      getProductsSpy.mockRestore();
    });

    it('should return only products matching the specified category', async () => {
      const storedData = {
        [`product_${mockProduct1.id}`]: mockProduct1, // Category A
        [`product_${mockProduct2.id}`]: mockProduct2, // Category B
        [`product_${mockProduct3.id}`]: mockProduct3, // Category A
      };
      (chrome.storage.local.get as unknown as Mock).mockResolvedValue(storedData);

      const categoryAProducts = await storage.getProductsByCategory('A');
      expect(categoryAProducts).toHaveLength(2);
      expect(categoryAProducts).toEqual(expect.arrayContaining([mockProduct1, mockProduct3]));

      const categoryBProducts = await storage.getProductsByCategory('B');
      expect(categoryBProducts).toHaveLength(1);
      expect(categoryBProducts).toEqual([mockProduct2]);
    });

    it('should return an empty array if no products match the category', async () => {
      const storedData = {
        [`product_${mockProduct1.id}`]: mockProduct1, // Category A
        [`product_${mockProduct2.id}`]: mockProduct2, // Category B
      };
      (chrome.storage.local.get as unknown as Mock).mockResolvedValue(storedData);

      const categoryCProducts = await storage.getProductsByCategory('C');
      expect(categoryCProducts).toEqual([]);
    });

    it('should return an empty array if storage is empty', async () => {
      (chrome.storage.local.get as unknown as Mock).mockResolvedValue({});
      const products = await storage.getProductsByCategory('A');
      expect(products).toEqual([]);
    });

    // Optional: Test case sensitivity if categories are case-sensitive
  });
}); 