/**
 * Salma Concepts — Data Store (localStorage Manager)
 * Shared between customer-facing site and admin panel.
 */

const KEYS = {
  PRODUCTS: 'sc_products',
  CATEGORIES: 'sc_categories',
  ABOUT: 'sc_about',
  HERO: 'sc_hero',
  INITIALIZED: 'sc_initialized',
};

export const Store = {
  // ── Products ──
  getProducts() {
    const data = localStorage.getItem(KEYS.PRODUCTS);
    return data ? JSON.parse(data) : [];
  },

  setProducts(products) {
    localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(products));
  },

  addProduct(product) {
    const products = this.getProducts();
    product.id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    product.createdAt = new Date().toISOString();
    products.push(product);
    this.setProducts(products);
    return product;
  },

  updateProduct(id, updates) {
    const products = this.getProducts();
    const index = products.findIndex(p => p.id === id);
    if (index !== -1) {
      products[index] = { ...products[index], ...updates, updatedAt: new Date().toISOString() };
      this.setProducts(products);
      return products[index];
    }
    return null;
  },

  deleteProduct(id) {
    const products = this.getProducts().filter(p => p.id !== id);
    this.setProducts(products);
  },

  getProductsByCategory(categoryId) {
    if (!categoryId || categoryId === 'all') return this.getProducts();
    return this.getProducts().filter(p => p.category === categoryId);
  },

  // ── Categories ──
  getCategories() {
    const data = localStorage.getItem(KEYS.CATEGORIES);
    return data ? JSON.parse(data) : [];
  },

  setCategories(categories) {
    localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(categories));
  },

  addCategory(category) {
    const categories = this.getCategories();
    category.id = category.name.toLowerCase().replace(/\s+/g, '-');
    // Ensure unique id
    const existing = categories.find(c => c.id === category.id);
    if (existing) {
      category.id += '-' + Date.now().toString(36);
    }
    categories.push(category);
    this.setCategories(categories);
    return category;
  },

  updateCategory(id, updates) {
    const categories = this.getCategories();
    const index = categories.findIndex(c => c.id === id);
    if (index !== -1) {
      const oldId = categories[index].id;
      categories[index] = { ...categories[index], ...updates };
      this.setCategories(categories);
      // If name changed, update id and all product references
      if (updates.name) {
        const newId = updates.name.toLowerCase().replace(/\s+/g, '-');
        if (newId !== oldId) {
          categories[index].id = newId;
          this.setCategories(categories);
          // Update products with old category
          const products = this.getProducts();
          products.forEach(p => {
            if (p.category === oldId) p.category = newId;
          });
          this.setProducts(products);
        }
      }
      return categories[index];
    }
    return null;
  },

  deleteCategory(id) {
    const categories = this.getCategories().filter(c => c.id !== id);
    this.setCategories(categories);
    // Also delete products in this category
    const products = this.getProducts().filter(p => p.category !== id);
    this.setProducts(products);
  },

  // ── About Content ──
  getAbout() {
    const data = localStorage.getItem(KEYS.ABOUT);
    return data ? JSON.parse(data) : {
      title: 'Our Story',
      text: 'At Salma Concepts, we believe that every woman deserves to adorn herself with pieces that reflect her inner radiance. Our curated collection of imitation jewellery combines exquisite craftsmanship with affordable luxury, ensuring you never have to compromise on elegance.\n\nEach piece in our collection is thoughtfully designed to capture the essence of fine jewellery — from the intricate detailing of our bangles to the statement elegance of our necklaces. We source only the finest materials to create pieces that look and feel premium.',
    };
  },

  setAbout(about) {
    localStorage.setItem(KEYS.ABOUT, JSON.stringify(about));
  },

  // ── Hero Content ──
  getHero() {
    const data = localStorage.getItem(KEYS.HERO);
    return data ? JSON.parse(data) : {
      tagline: 'Elegance Redefined',
      subtitle: 'Discover our exquisite collection of handcrafted jewellery',
    };
  },

  setHero(hero) {
    localStorage.setItem(KEYS.HERO, JSON.stringify(hero));
  },

  // ── Data Management ──
  exportData() {
    return JSON.stringify({
      products: this.getProducts(),
      categories: this.getCategories(),
      about: this.getAbout(),
      hero: this.getHero(),
      exportedAt: new Date().toISOString(),
    }, null, 2);
  },

  importData(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (data.products) this.setProducts(data.products);
      if (data.categories) this.setCategories(data.categories);
      if (data.about) this.setAbout(data.about);
      if (data.hero) this.setHero(data.hero);
      return true;
    } catch (e) {
      console.error('Import failed:', e);
      return false;
    }
  },

  isInitialized() {
    return localStorage.getItem(KEYS.INITIALIZED) === 'true';
  },

  markInitialized() {
    localStorage.setItem(KEYS.INITIALIZED, 'true');
  },
};
