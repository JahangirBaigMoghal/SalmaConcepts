/**
 * Salma Concepts — Data Store (Firebase Firestore)
 * Shared between customer-facing site and admin panel.
 *
 * All methods are async.  The customer site uses real-time listeners
 * (onProductsChange / onCategoriesChange) so the catalogue updates
 * the instant the admin makes a change.
 */
import { db, storage } from './firebase.js';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  query,
  orderBy,
} from 'firebase/firestore';
import {
  ref,
  uploadBytes,
  getDownloadURL,
} from 'firebase/storage';

// ── Collection references ──
const productsCol = collection(db, 'products');
const categoriesCol = collection(db, 'categories');

// ── Helper: generate a short unique id ──
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

export const Store = {

  // ═══════════════════════════════════════════
  //  PRODUCTS
  // ═══════════════════════════════════════════

  async getProducts() {
    const snap = await getDocs(query(productsCol, orderBy('createdAt', 'desc')));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async addProduct(product) {
    const id = uid();
    product.createdAt = new Date().toISOString();
    await setDoc(doc(db, 'products', id), product);
    return { id, ...product };
  },

  async updateProduct(id, updates) {
    updates.updatedAt = new Date().toISOString();
    const docRef = doc(db, 'products', id);
    await updateDoc(docRef, updates);
    const snap = await getDoc(docRef);
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  },

  async deleteProduct(id) {
    await deleteDoc(doc(db, 'products', id));
  },

  async getProductsByCategory(categoryId) {
    const all = await this.getProducts();
    if (!categoryId || categoryId === 'all') return all;
    return all.filter(p => p.category === categoryId);
  },

  /** Real-time listener — calls `callback(products[])` on every change */
  onProductsChange(callback) {
    return onSnapshot(query(productsCol, orderBy('createdAt', 'desc')), snap => {
      callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  },

  // ═══════════════════════════════════════════
  //  CATEGORIES
  // ═══════════════════════════════════════════

  async getCategories() {
    const snap = await getDocs(categoriesCol);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async addCategory(category) {
    const id = category.name.toLowerCase().replace(/\s+/g, '-');
    // Ensure unique id
    const existing = await getDoc(doc(db, 'categories', id));
    const finalId = existing.exists() ? id + '-' + Date.now().toString(36) : id;
    await setDoc(doc(db, 'categories', finalId), { name: category.name, hidden: category.hidden || false });
    return { id: finalId, name: category.name };
  },

  async updateCategory(id, updates) {
    const docRef = doc(db, 'categories', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;

    const oldData = snap.data();
    const merged = { ...oldData, ...updates };

    // If name changed, we need to update the id (slug) and all product refs
    if (updates.name) {
      const newId = updates.name.toLowerCase().replace(/\s+/g, '-');
      if (newId !== id) {
        // Create new doc, delete old
        await setDoc(doc(db, 'categories', newId), merged);
        await deleteDoc(docRef);
        // Update all products referencing old category
        const products = await this.getProducts();
        const batch = writeBatch(db);
        products.forEach(p => {
          if (p.category === id) {
            batch.update(doc(db, 'products', p.id), { category: newId });
          }
        });
        await batch.commit();
        return { id: newId, ...merged };
      }
    }

    await updateDoc(docRef, updates);
    return { id, ...merged };
  },

  async deleteCategory(id) {
    await deleteDoc(doc(db, 'categories', id));
    // Also delete products in this category
    const products = await this.getProducts();
    const batch = writeBatch(db);
    products.forEach(p => {
      if (p.category === id) {
        batch.delete(doc(db, 'products', p.id));
      }
    });
    await batch.commit();
  },

  /** Real-time listener — calls `callback(categories[])` on every change */
  onCategoriesChange(callback) {
    return onSnapshot(categoriesCol, snap => {
      callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  },

  // ═══════════════════════════════════════════
  //  ABOUT CONTENT
  // ═══════════════════════════════════════════

  async getAbout() {
    const snap = await getDoc(doc(db, 'content', 'about'));
    if (snap.exists()) return snap.data();
    return {
      title: 'Our Story',
      text: 'At Salma Concepts, we believe that every woman deserves to adorn herself with pieces that reflect her inner radiance. Our curated collection of imitation jewellery combines exquisite craftsmanship with affordable luxury, ensuring you never have to compromise on elegance.\n\nEach piece in our collection is thoughtfully designed to capture the essence of fine jewellery — from the intricate detailing of our bangles to the statement elegance of our necklaces. We source only the finest materials to create pieces that look and feel premium.',
    };
  },

  async setAbout(about) {
    await setDoc(doc(db, 'content', 'about'), about);
  },

  // ═══════════════════════════════════════════
  //  HERO CONTENT
  // ═══════════════════════════════════════════

  async getHero() {
    const snap = await getDoc(doc(db, 'content', 'hero'));
    if (snap.exists()) return snap.data();
    return {
      tagline: 'Elegance Redefined',
      subtitle: 'Discover our exquisite collection of handcrafted jewellery',
    };
  },

  async setHero(hero) {
    await setDoc(doc(db, 'content', 'hero'), hero);
  },

  // ═══════════════════════════════════════════
  //  IMAGE UPLOAD  (Firebase Storage)
  // ═══════════════════════════════════════════

  /**
   * Upload an image File to Firebase Storage.
   * @param {File} file  – the File object from an <input type="file">
   * @returns {Promise<string>} – the public download URL
   */
  async uploadImage(file) {
    const filename = `products/${uid()}_${file.name}`;
    const storageRef = ref(storage, filename);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
  },

  // ═══════════════════════════════════════════
  //  DATA MANAGEMENT  (Export / Import)
  // ═══════════════════════════════════════════

  async exportData() {
    const [products, categories, about, hero] = await Promise.all([
      this.getProducts(),
      this.getCategories(),
      this.getAbout(),
      this.getHero(),
    ]);
    return JSON.stringify({ products, categories, about, hero, exportedAt: new Date().toISOString() }, null, 2);
  },

  async importData(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      const batch = writeBatch(db);

      if (data.categories) {
        for (const cat of data.categories) {
          const { id, ...catData } = cat;
          batch.set(doc(db, 'categories', id), catData);
        }
      }
      if (data.products) {
        for (const prod of data.products) {
          const { id, ...prodData } = prod;
          batch.set(doc(db, 'products', id || uid()), prodData);
        }
      }

      await batch.commit();

      if (data.about) await this.setAbout(data.about);
      if (data.hero) await this.setHero(data.hero);

      return true;
    } catch (e) {
      console.error('Import failed:', e);
      return false;
    }
  },

  // ═══════════════════════════════════════════
  //  INITIALISATION CHECK
  // ═══════════════════════════════════════════

  async isInitialized() {
    const snap = await getDoc(doc(db, '_meta', 'initialized'));
    return snap.exists() && snap.data().value === true;
  },

  async markInitialized() {
    await setDoc(doc(db, '_meta', 'initialized'), { value: true });
  },
};
