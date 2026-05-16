/**
 * Salma Concepts — Admin Panel
 */
import './styles/variables.css';
import './styles/base.css';
import './styles/admin.css';

import { Store } from './data/store.js';
import { seedData } from './data/seed.js';
import { auth } from './data/firebase.js';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';

// ── Boot ──
(async () => {
  await seedData();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

function boot() {
  initAuth();
  initTabs();
  initProductCRUD();
  initCategoryCRUD();
  initContentEditor();
  initDataManagement();
}

// ═══════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════
function initAuth() {
  const loginScreen = document.getElementById('admin-login');
  const dashboard = document.getElementById('admin-dashboard');
  const loginForm = document.getElementById('login-form');
  const loginError = document.getElementById('login-error');

  // Check session via Firebase Auth listener
  onAuthStateChanged(auth, (user) => {
    if (user) {
      loginScreen.style.display = 'none';
      dashboard.style.display = 'block';
      loadAllData();
    } else {
      loginScreen.style.display = 'block';
      dashboard.style.display = 'none';
    }
  });

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const pw = document.getElementById('login-password').value;
    
    try {
      await signInWithEmailAndPassword(auth, email, pw);
      // onAuthStateChanged will handle the UI update
    } catch (error) {
      console.error('Login error:', error);
      loginError.style.display = 'block';
      loginError.textContent = 'Incorrect email or password. Please try again.';
      setTimeout(() => { loginError.style.display = 'none'; }, 3000);
    }
  });

  document.getElementById('btn-logout').addEventListener('click', async () => {
    try {
      await signOut(auth);
      location.reload();
    } catch (error) {
      console.error('Logout error:', error);
    }
  });
}

async function loadAllData() {
  await renderProductsTable();
  await renderCategoriesGrid();
  await loadContentForms();
}

// ═══════════════════════════════════════════
// TABS
// ═══════════════════════════════════════════
function initTabs() {
  const tabs = document.querySelectorAll('.admin-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
    });
  });
}

// ═══════════════════════════════════════════
// PRODUCT CRUD
// ═══════════════════════════════════════════
let deleteCallback = null;
let productsFilterText = '';
let productsSortField = null; // 'name', 'category', 'price'
let productsSortDir = 'asc'; // 'asc' or 'desc'

function initProductCRUD() {
  const imageInputs = [
    document.getElementById('product-image-1'),
    document.getElementById('product-image-2'),
    document.getElementById('product-image-3')
  ];
  const previews = [
    document.getElementById('product-image-preview-1'),
    document.getElementById('product-image-preview-2'),
    document.getElementById('product-image-preview-3')
  ];

  document.getElementById('btn-add-product').addEventListener('click', () => {
    openProductModal();
  });

  // Search
  const searchInput = document.getElementById('search-products');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      productsFilterText = e.target.value.toLowerCase();
      renderProductsTable();
    });
  }

  // Sort
  document.querySelectorAll('#products-table th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const field = th.dataset.sort;
      if (productsSortField === field) {
        productsSortDir = productsSortDir === 'asc' ? 'desc' : 'asc';
      } else {
        productsSortField = field;
        productsSortDir = 'asc';
      }
      
      // Update arrows
      document.querySelectorAll('#products-table th.sortable').forEach(header => {
        header.textContent = header.textContent.replace(/ [↑↓↕]/, '') + ' ↕';
      });
      th.textContent = th.textContent.replace(/ [↑↓↕]/, '') + (productsSortDir === 'asc' ? ' ↑' : ' ↓');
      
      renderProductsTable();
    });
  });

  // Image previews
  imageInputs.forEach((input, index) => {
    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          previews[index].src = ev.target.result;
          previews[index].classList.add('visible');
        };
        reader.readAsDataURL(file);
      } else {
        previews[index].src = '';
        previews[index].classList.remove('visible');
      }
    });
  });

  // Save
  document.getElementById('product-modal-save').addEventListener('click', async () => {
    const editId = document.getElementById('product-edit-id').value;
    const name = document.getElementById('product-name').value.trim();
    const category = document.getElementById('product-category').value;
    const price = document.getElementById('product-price').value;
    const soldOut = document.getElementById('product-sold-out').checked;

    if (!name || !category || !price) {
      showToast('Please fill in all required fields.', 'error');
      return;
    }

    const saveBtn = document.getElementById('product-modal-save');

    try {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving…';

      // We need to figure out existing images if editing
      let existingImages = [];
      if (editId) {
        const prods = await Store.getProducts();
        const existingProd = prods.find(p => p.id === editId);
        if (existingProd) {
          existingImages = existingProd.images || (existingProd.image ? [existingProd.image] : []);
        }
      }

      saveBtn.textContent = 'Uploading images…';
      
      const newImages = [...existingImages];
      // Upload up to 3 images
      for (let i = 0; i < 3; i++) {
        const file = imageInputs[i].files[0];
        if (file) {
          const url = await Store.uploadImage(file);
          newImages[i] = url; // replace existing at index, or append
        }
      }

      // Cleanup undefined/null values in newImages array in case of sparse array
      const finalImages = newImages.filter(url => url);

      const productData = { name, category, price, soldOut };
      if (finalImages.length > 0) {
        productData.images = finalImages;
        productData.image = finalImages[0]; // For backwards compatibility
      }

      if (editId) {
        await Store.updateProduct(editId, productData);
        showToast('Product updated successfully!', 'success');
      } else {
        if (finalImages.length === 0) {
          showToast('Please select a primary image for new products.', 'error');
          saveBtn.disabled = false;
          saveBtn.textContent = 'Save Product';
          return;
        }
        await Store.addProduct(productData);
        showToast('Product added successfully!', 'success');
      }

      closeModal('product-modal');
      await renderProductsTable();
    } catch (err) {
      console.error('Save product error:', err);
      showToast('Failed to save product. Check console for details.', 'error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Product';
    }
  });

  // Close handlers
  document.getElementById('product-modal-close').addEventListener('click', () => closeModal('product-modal'));
  document.getElementById('product-modal-cancel').addEventListener('click', () => closeModal('product-modal'));

  // Delete modal
  document.getElementById('delete-cancel').addEventListener('click', () => closeModal('delete-modal'));
  document.getElementById('delete-confirm').addEventListener('click', async () => {
    if (deleteCallback) await deleteCallback();
    closeModal('delete-modal');
  });
}

async function openProductModal(product = null) {
  const modal = document.getElementById('product-modal');
  const title = document.getElementById('product-modal-title');
  const catSelect = document.getElementById('product-category');
  
  const previews = [
    document.getElementById('product-image-preview-1'),
    document.getElementById('product-image-preview-2'),
    document.getElementById('product-image-preview-3')
  ];

  // Populate categories dropdown
  const categories = await Store.getCategories();
  catSelect.innerHTML = categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

  if (product) {
    title.textContent = 'Edit Product';
    document.getElementById('product-edit-id').value = product.id;
    document.getElementById('product-name').value = product.name;
    document.getElementById('product-category').value = product.category;
    document.getElementById('product-price').value = product.price;
    document.getElementById('product-sold-out').checked = !!product.soldOut;
    
    const productImages = product.images || (product.image ? [product.image] : []);
    previews.forEach((p, i) => {
      if (productImages[i]) {
        p.src = productImages[i];
        p.classList.add('visible');
      } else {
        p.src = '';
        p.classList.remove('visible');
      }
    });
  } else {
    title.textContent = 'Add Product';
    document.getElementById('product-edit-id').value = '';
    document.getElementById('product-form').reset();
    document.getElementById('product-sold-out').checked = false;
    previews.forEach(p => p.classList.remove('visible'));
  }

  modal.classList.add('active');
}

async function renderProductsTable() {
  const tbody = document.getElementById('products-tbody');
  let products = await Store.getProducts();
  const categories = await Store.getCategories();

  // Apply Filter
  if (productsFilterText) {
    products = products.filter(p => {
      const catName = categories.find(c => c.id === p.category)?.name || p.category;
      return p.name.toLowerCase().includes(productsFilterText) || catName.toLowerCase().includes(productsFilterText);
    });
  }

  // Apply Sort
  if (productsSortField) {
    products.sort((a, b) => {
      let valA, valB;
      if (productsSortField === 'name') {
        valA = a.name.toLowerCase();
        valB = b.name.toLowerCase();
      } else if (productsSortField === 'category') {
        valA = (categories.find(c => c.id === a.category)?.name || a.category).toLowerCase();
        valB = (categories.find(c => c.id === b.category)?.name || b.category).toLowerCase();
      } else if (productsSortField === 'price') {
        valA = parseFloat(a.price) || 0;
        valB = parseFloat(b.price) || 0;
      }
      
      if (valA < valB) return productsSortDir === 'asc' ? -1 : 1;
      if (valA > valB) return productsSortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }

  if (products.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted); padding:2rem;">No products found.</td></tr>`;
    return;
  }

  tbody.innerHTML = products.map(p => {
    const cat = categories.find(c => c.id === p.category);
    const isHidden = p.hidden;
    const isSoldOut = p.soldOut;
    const rowStyle = isHidden ? 'opacity: 0.45;' : '';
    const hiddenBadge = isHidden ? ' <span style="color:#ff9800; font-size:0.65rem; text-transform:uppercase; letter-spacing:0.08em; font-weight:600;">(Hidden)</span>' : '';
    const soldOutBadge = isSoldOut ? ' <span style="color:#e74c3c; font-size:0.65rem; text-transform:uppercase; letter-spacing:0.08em; font-weight:600;">(Sold Out)</span>' : '';
    const toggleLabel = isHidden ? 'Show' : 'Hide';
    const toggleClass = isHidden ? 'btn-show' : 'btn-hide';
    const primaryImage = p.images && p.images.length > 0 ? p.images[0] : p.image;
    return `
      <tr style="${rowStyle}">
        <td><img src="${primaryImage}" alt="${p.name}" class="thumb" /></td>
        <td>${p.name}${hiddenBadge}${soldOutBadge}</td>
        <td>${cat ? cat.name : p.category}</td>
        <td>\u00a3${p.price}</td>
        <td>
          <div class="actions">
            <button class="btn-sm ${toggleClass}" data-id="${p.id}" data-action="toggle-visibility">${toggleLabel}</button>
            <button class="btn-sm btn-edit" data-id="${p.id}">Edit</button>
            <button class="btn-sm btn-delete" data-id="${p.id}" data-name="${p.name}">Delete</button>
          </div>
        </td>
      </tr>`;
  }).join('');

  // Visibility toggle buttons
  tbody.querySelectorAll('[data-action="toggle-visibility"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const prods = await Store.getProducts();
      const product = prods.find(p => p.id === btn.dataset.id);
      if (product) {
        await Store.updateProduct(btn.dataset.id, { hidden: !product.hidden });
        await renderProductsTable();
        showToast(product.hidden ? 'Product is now visible.' : 'Product hidden from catalogue.', 'success');
      }
    });
  });

  // Edit buttons
  tbody.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', async () => {
      const prods = await Store.getProducts();
      const product = prods.find(p => p.id === btn.dataset.id);
      if (product) openProductModal(product);
    });
  });

  // Delete buttons
  tbody.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('delete-message').textContent = `Are you sure you want to delete "${btn.dataset.name}"?`;
      deleteCallback = async () => {
        await Store.deleteProduct(btn.dataset.id);
        await renderProductsTable();
        showToast('Product deleted.', 'success');
      };
      document.getElementById('delete-modal').classList.add('active');
    });
  });
}

// ═══════════════════════════════════════════
// CATEGORY CRUD
// ═══════════════════════════════════════════
let categoriesFilterText = '';

function initCategoryCRUD() {
  document.getElementById('btn-add-category').addEventListener('click', () => {
    openCategoryModal();
  });

  const searchInput = document.getElementById('search-categories');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      categoriesFilterText = e.target.value.toLowerCase();
      renderCategoriesGrid();
    });
  }

  document.getElementById('category-modal-save').addEventListener('click', async () => {
    const editId = document.getElementById('category-edit-id').value;
    const name = document.getElementById('category-name').value.trim();
    if (!name) {
      showToast('Please enter a category name.', 'error');
      return;
    }
    try {
      if (editId) {
        await Store.updateCategory(editId, { name });
        showToast('Category updated!', 'success');
      } else {
        await Store.addCategory({ name });
        showToast('Category added!', 'success');
      }
      closeModal('category-modal');
      await renderCategoriesGrid();
    } catch (err) {
      console.error('Save category error:', err);
      showToast('Failed to save category.', 'error');
    }
  });

  document.getElementById('category-modal-close').addEventListener('click', () => closeModal('category-modal'));
  document.getElementById('category-modal-cancel').addEventListener('click', () => closeModal('category-modal'));
}

function openCategoryModal(category = null) {
  const title = document.getElementById('category-modal-title');
  if (category) {
    title.textContent = 'Edit Category';
    document.getElementById('category-edit-id').value = category.id;
    document.getElementById('category-name').value = category.name;
  } else {
    title.textContent = 'Add Category';
    document.getElementById('category-edit-id').value = '';
    document.getElementById('category-form').reset();
  }
  document.getElementById('category-modal').classList.add('active');
}

async function renderCategoriesGrid() {
  const grid = document.getElementById('categories-grid');
  let categories = await Store.getCategories();
  const products = await Store.getProducts();

  if (categoriesFilterText) {
    categories = categories.filter(c => c.name.toLowerCase().includes(categoriesFilterText));
  }

  if (categories.length === 0) {
    grid.innerHTML = `<p style="color:var(--text-muted);">No categories found.</p>`;
    return;
  }

  grid.innerHTML = categories.map(cat => {
    const count = products.filter(p => p.category === cat.id).length;
    const isHidden = cat.hidden;
    const cardStyle = isHidden ? 'opacity: 0.45;' : '';
    const hiddenBadge = isHidden ? ' <span style="color:#ff9800; font-size:0.6rem; text-transform:uppercase; letter-spacing:0.08em;">(Hidden)</span>' : '';
    const toggleLabel = isHidden ? 'Show' : 'Hide';
    const toggleClass = isHidden ? 'btn-show' : 'btn-hide';
    return `
      <div class="category-card" style="${cardStyle}">
        <div class="category-card-info">
          <h4>${cat.name}${hiddenBadge}</h4>
          <span>${count} product${count !== 1 ? 's' : ''}</span>
        </div>
        <div class="actions">
          <button class="btn-sm ${toggleClass}" data-id="${cat.id}" data-action="toggle-cat-visibility">${toggleLabel}</button>
          <button class="btn-sm btn-edit" data-id="${cat.id}">Edit</button>
          <button class="btn-sm btn-delete" data-id="${cat.id}" data-name="${cat.name}">Delete</button>
        </div>
      </div>`;
  }).join('');

  // Category visibility toggles
  grid.querySelectorAll('[data-action="toggle-cat-visibility"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const cats = await Store.getCategories();
      const cat = cats.find(c => c.id === btn.dataset.id);
      if (cat) {
        await Store.updateCategory(btn.dataset.id, { hidden: !cat.hidden });
        await renderCategoriesGrid();
        showToast(cat.hidden ? 'Category is now visible.' : 'Category hidden from catalogue.', 'success');
      }
    });
  });

  grid.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', async () => {
      const cats = await Store.getCategories();
      const cat = cats.find(c => c.id === btn.dataset.id);
      if (cat) openCategoryModal(cat);
    });
  });

  grid.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      const prods = await Store.getProducts();
      const count = prods.filter(p => p.category === btn.dataset.id).length;
      document.getElementById('delete-message').textContent = `Delete "${btn.dataset.name}"? This will also remove ${count} product(s) in this category.`;
      deleteCallback = async () => {
        await Store.deleteCategory(btn.dataset.id);
        await renderCategoriesGrid();
        await renderProductsTable();
        showToast('Category deleted.', 'success');
      };
      document.getElementById('delete-modal').classList.add('active');
    });
  });
}

// ═══════════════════════════════════════════
// CONTENT EDITOR
// ═══════════════════════════════════════════
function initContentEditor() {
  document.getElementById('btn-save-hero').addEventListener('click', async () => {
    try {
      await Store.setHero({
        tagline: document.getElementById('hero-tagline-input').value,
        subtitle: document.getElementById('hero-subtitle-input').value,
      });
      showToast('Hero content saved!', 'success');
    } catch (err) {
      console.error('Save hero error:', err);
      showToast('Failed to save hero content.', 'error');
    }
  });

  document.getElementById('btn-save-about').addEventListener('click', async () => {
    try {
      await Store.setAbout({
        title: document.getElementById('about-title-input').value,
        text: document.getElementById('about-text-input').value,
      });
      showToast('About content saved!', 'success');
    } catch (err) {
      console.error('Save about error:', err);
      showToast('Failed to save about content.', 'error');
    }
  });
}

async function loadContentForms() {
  const hero = await Store.getHero();
  document.getElementById('hero-tagline-input').value = hero.tagline || '';
  document.getElementById('hero-subtitle-input').value = hero.subtitle || '';

  const about = await Store.getAbout();
  document.getElementById('about-title-input').value = about.title || '';
  document.getElementById('about-text-input').value = about.text || '';
}

// ═══════════════════════════════════════════
// DATA MANAGEMENT (Export/Import)
// ═══════════════════════════════════════════
function initDataManagement() {
  document.getElementById('btn-export').addEventListener('click', async () => {
    try {
      const data = await Store.exportData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `salma-concepts-backup-${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Data exported successfully!', 'success');
    } catch (err) {
      console.error('Export error:', err);
      showToast('Export failed.', 'error');
    }
  });

  document.getElementById('btn-import').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const success = await Store.importData(ev.target.result);
      if (success) {
        showToast('Data imported successfully! Reloading...', 'success');
        setTimeout(() => location.reload(), 1500);
      } else {
        showToast('Import failed. Invalid file format.', 'error');
      }
    };
    reader.readAsText(file);
  });
}

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════
function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast show ${type}`;
  setTimeout(() => { toast.className = 'toast'; }, 3000);
}
