/**
 * Salma Concepts — Seed Data (Firestore)
 * Seeds default categories and products into Firestore on first run.
 */
import { Store } from './store.js';
import { db } from './firebase.js';
import { doc, setDoc } from 'firebase/firestore';

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
  },
  {
    id: 'seed-2',
    name: 'Empress Chain Bracelet',
    price: '18.99',
    category: 'bracelets',
    image: '/images/product-bracelet.png',
  },
  {
    id: 'seed-3',
    name: 'Opulent Gemstone Ring',
    price: '14.99',
    category: 'rings',
    image: '/images/product-rings.png',
  },
  {
    id: 'seed-4',
    name: 'Chandelier Drop Earrings',
    price: '19.99',
    category: 'earrings',
    image: '/images/product-earrings.png',
  },
  {
    id: 'seed-5',
    name: 'Crystal Floral Hair Clip',
    price: '12.99',
    category: 'hairclips',
    image: '/images/product-hairclip.png',
  },
  {
    id: 'seed-6',
    name: 'Luxe Evening Clutch',
    price: '34.99',
    category: 'handbags',
    image: '/images/product-handbag.png',
  },
  {
    id: 'seed-7',
    name: 'Statement Gold Necklace',
    price: '29.99',
    category: 'necklaces',
    image: '/images/product-necklace.png',
  },
];

export async function seedData() {
  try {
    // 1. Check if there is data in localStorage to migrate
    const localProductsData = localStorage.getItem('sc_products');
    
    if (localProductsData) {
      console.log('Salma Concepts: Migrating local data to Firestore...');
      const localProducts = JSON.parse(localProductsData);
      const localCategoriesData = localStorage.getItem('sc_categories');
      const localCategories = localCategoriesData ? JSON.parse(localCategoriesData) : DEFAULT_CATEGORIES;
      
      for (const cat of localCategories) {
        await setDoc(doc(db, 'categories', cat.id), { name: cat.name, hidden: cat.hidden || false });
      }

      for (const prod of localProducts) {
        const { id, ...data } = prod;
        data.createdAt = data.createdAt || new Date().toISOString();
        data.hidden = data.hidden || false;
        await setDoc(doc(db, 'products', id), data);
      }

      const localHeroData = localStorage.getItem('sc_hero');
      if (localHeroData) await Store.setHero(JSON.parse(localHeroData));
      
      const localAboutData = localStorage.getItem('sc_about');
      if (localAboutData) await Store.setAbout(JSON.parse(localAboutData));

      // Clean up localStorage so we don't migrate again
      localStorage.removeItem('sc_products');
      localStorage.removeItem('sc_categories');
      localStorage.removeItem('sc_hero');
      localStorage.removeItem('sc_about');
      localStorage.removeItem('sc_initialized');

      await Store.markInitialized();
      console.log('Salma Concepts: Migration complete.');
      return;
    }

    // 2. Otherwise, check if Firestore is already initialized
    const initialized = await Store.isInitialized();
    if (initialized) return;

    // Seed default categories
    for (const cat of DEFAULT_CATEGORIES) {
      await setDoc(doc(db, 'categories', cat.id), { name: cat.name, hidden: false });
    }

    // Seed default products
    for (const prod of DEFAULT_PRODUCTS) {
      const { id, ...data } = prod;
      data.createdAt = new Date().toISOString();
      data.hidden = false;
      await setDoc(doc(db, 'products', id), data);
    }

    await Store.markInitialized();
    console.log('Salma Concepts: Seed data loaded into Firestore.');
  } catch (e) {
    console.error('Salma Concepts: Seed/Migration failed —', e);
  }
}
