/**
 * Salma Concepts — Seed Data
 */
import { Store } from './store.js';

const DEFAULT_CATEGORIES = [
  { id: 'bangles', name: 'Bangles' },
  { id: 'bracelets', name: 'Bracelets' },
  { id: 'rings', name: 'Rings' },
  { id: 'earrings', name: 'Earrings' },
  { id: 'hairclips', name: 'Hairclips' },
  { id: 'handbags', name: 'Handbags' },
  { id: 'necklaces', name: 'Necklaces' },
];

const DEFAULT_PRODUCTS = [
  {
    id: 'seed-1',
    name: 'Royal Gold Bangle Set',
    price: '24.99',
    category: 'bangles',
    image: '/images/product-bangles.png',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'seed-2',
    name: 'Empress Chain Bracelet',
    price: '18.99',
    category: 'bracelets',
    image: '/images/product-bracelet.png',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'seed-3',
    name: 'Opulent Gemstone Ring',
    price: '14.99',
    category: 'rings',
    image: '/images/product-rings.png',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'seed-4',
    name: 'Chandelier Drop Earrings',
    price: '19.99',
    category: 'earrings',
    image: '/images/product-earrings.png',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'seed-5',
    name: 'Crystal Floral Hair Clip',
    price: '12.99',
    category: 'hairclips',
    image: '/images/product-hairclip.png',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'seed-6',
    name: 'Luxe Evening Clutch',
    price: '34.99',
    category: 'handbags',
    image: '/images/product-handbag.png',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'seed-7',
    name: 'Statement Gold Necklace',
    price: '29.99',
    category: 'necklaces',
    image: '/images/product-necklace.png',
    createdAt: new Date().toISOString(),
  },
];

export function seedData() {
  if (!Store.isInitialized()) {
    Store.setCategories(DEFAULT_CATEGORIES);
    Store.setProducts(DEFAULT_PRODUCTS);
    Store.markInitialized();
    console.log('Salma Concepts: Seed data loaded.');
  }
}
