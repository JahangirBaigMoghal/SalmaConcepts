/**
 * Salma Concepts — Admin Panel
 */
import './styles/variables.css';
import './styles/base.css';
import './styles/admin.css';

import { Store } from './data/store.js';
import { seedData } from './data/seed.js';

seedData();

const ADMIN_PASSWORD = 'SalmaConcepts2026';

document.addEventListener('DOMContentLoaded', () => {
  initAuth();
  initTabs();
  initProductCRUD();
  initCategoryCRUD();
  initContentEditor();
  initDataManagement();
});

// ═══════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════
function initAuth() {
  const loginScreen = document.getElementById('admin-login');
  const dashboard = document.getElementById('admin-dashboard');
  const loginForm = document.getElementById('login-form');
  const loginError = document.getElementById('login-error');

  // Check session
  if (sessionStorage.getItem('sc_admin_auth') === 'true') {
    loginScreen.style.display = 'none';
    dashboard.style.display = 'block';
    loadAllData();
  }

  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const pw = document.getElementById('login-password').value;
    if (pw === ADMIN_PASSWORD) {
      sessionStorage.setItem('sc_admin_auth', 'true');
      loginScreen.style.display = 'none';
      dashboard.style.display = 'block';
      loadAllData();
    } else {
      loginError.style.display = 'block';
      setTimeout(() => { loginError.style.display = 'none'; }, 3000);
    }
  });

  document.getElementById('btn-logout').addEventListener('click', () => {
    sessionStorage.removeItem('sc_admin_auth');
    location.reload();
  });
}

function loadAllData() {
  renderProductsTable();
  renderCategoriesGrid();
  loadContentForms();
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

function initProductCRUD() {
  const modal = document.getElementById('product-modal');
  const form = document.getElementById('product-form');
  const imageInput = document.getElementById('product-image');
  const preview = document.getElementById('product-image-preview');

  document.getElementById('btn-add-product').addEventListener('click', () => {
    openProductModal();
  });

  // Image preview
  imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        preview.src = ev.target.result;
        preview.classList.add('visible');
      };
      reader.readAsDataURL(file);
    }
  });

  // Save
  document.getElementById('product-modal-save').addEventListener('click', () => {
    const editId = document.getElementById('product-edit-id').value;
    const name = document.getElementById('product-name').value.trim();
    const category = document.getElementById('product-category').value;
    const price = document.getElementById('product-price').value;

    if (!name || !category || !price) {
      showToast('Please fill in all required fields.', 'error');
      return;
    }

    const imageFile = imageInput.files[0];

    const saveProduct = (imageData) => {
      const productData = { name, category, price };
      if (imageData) productData.image = imageData;

      if (editId) {
        Store.updateProduct(editId, productData);
        showToast('Product updated successfully!', 'success');
      } else {
        if (!imageData) {
          showToast('Please select an image for new products.', 'error');
          return;
        }
        Store.addProduct(productData);
        showToast('Product added successfully!', 'success');
      }
      closeModal('product-modal');
      renderProductsTable();
    };

    if (imageFile) {
      const reader = new FileReader();
      reader.onload = (ev) => saveProduct(ev.target.result);
      reader.readAsDataURL(imageFile);
    } else {
      saveProduct(null);
    }
  });

  // Close handlers
  document.getElementById('product-modal-close').addEventListener('click', () => closeModal('product-modal'));
  document.getElementById('product-modal-cancel').addEventListener('click', () => closeModal('product-modal'));

  // Delete modal
  document.getElementById('delete-cancel').addEventListener('click', () => closeModal('delete-modal'));
  document.getElementById('delete-confirm').addEventListener('click', () => {
    if (deleteCallback) deleteCallback();
    closeModal('delete-modal');
  });
}

function openProductModal(product = null) {
  const modal = document.getElementById('product-modal');
  const title = document.getElementById('product-modal-title');
  const preview = document.getElementById('product-image-preview');
  const catSelect = document.getElementById('product-category');

  // Populate categories dropdown
  const categories = Store.getCategories();
  catSelect.innerHTML = categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

  if (product) {
    title.textContent = 'Edit Product';
    document.getElementById('product-edit-id').value = product.id;
    document.getElementById('product-name').value = product.name;
    document.getElementById('product-category').value = product.category;
    document.getElementById('product-price').value = product.price;
    if (product.image) {
      preview.src = product.image;
      preview.classList.add('visible');
    }
  } else {
    title.textContent = 'Add Product';
    document.getElementById('product-edit-id').value = '';
    document.getElementById('product-form').reset();
    preview.classList.remove('visible');
  }

  modal.classList.add('active');
}

function renderProductsTable() {
  const tbody = document.getElementById('products-tbody');
  const products = Store.getProducts();
  const categories = Store.getCategories();

  if (products.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:2rem;">No products yet. Click "Add Product" to get started.</td></tr>`;
    return;
  }

  tbody.innerHTML = products.map(p => {
    const cat = categories.find(c => c.id === p.category);
    return `
      <tr>
        <td><img src="${p.image}" alt="${p.name}" class="thumb" /></td>
        <td>${p.name}</td>
        <td>${cat ? cat.name : p.category}</td>
        <td>£${p.price}</td>
        <td>
          <div class="actions">
            <button class="btn-sm btn-edit" data-id="${p.id}">Edit</button>
            <button class="btn-sm btn-delete" data-id="${p.id}" data-name="${p.name}">Delete</button>
          </div>
        </td>
      </tr>`;
  }).join('');

  // Edit buttons
  tbody.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', () => {
      const product = Store.getProducts().find(p => p.id === btn.dataset.id);
      if (product) openProductModal(product);
    });
  });

  // Delete buttons
  tbody.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('delete-message').textContent = `Are you sure you want to delete "${btn.dataset.name}"?`;
      deleteCallback = () => {
        Store.deleteProduct(btn.dataset.id);
        renderProductsTable();
        showToast('Product deleted.', 'success');
      };
      document.getElementById('delete-modal').classList.add('active');
    });
  });
}

// ═══════════════════════════════════════════
// CATEGORY CRUD
// ═══════════════════════════════════════════
function initCategoryCRUD() {
  document.getElementById('btn-add-category').addEventListener('click', () => {
    openCategoryModal();
  });

  document.getElementById('category-modal-save').addEventListener('click', () => {
    const editId = document.getElementById('category-edit-id').value;
    const name = document.getElementById('category-name').value.trim();
    if (!name) {
      showToast('Please enter a category name.', 'error');
      return;
    }
    if (editId) {
      Store.updateCategory(editId, { name });
      showToast('Category updated!', 'success');
    } else {
      Store.addCategory({ name });
      showToast('Category added!', 'success');
    }
    closeModal('category-modal');
    renderCategoriesGrid();
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

function renderCategoriesGrid() {
  const grid = document.getElementById('categories-grid');
  const categories = Store.getCategories();
  const products = Store.getProducts();

  if (categories.length === 0) {
    grid.innerHTML = `<p style="color:var(--text-muted);">No categories yet.</p>`;
    return;
  }

  grid.innerHTML = categories.map(cat => {
    const count = products.filter(p => p.category === cat.id).length;
    return `
      <div class="category-card">
        <div class="category-card-info">
          <h4>${cat.name}</h4>
          <span>${count} product${count !== 1 ? 's' : ''}</span>
        </div>
        <div class="actions">
          <button class="btn-sm btn-edit" data-id="${cat.id}">Edit</button>
          <button class="btn-sm btn-delete" data-id="${cat.id}" data-name="${cat.name}">Delete</button>
        </div>
      </div>`;
  }).join('');

  grid.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = Store.getCategories().find(c => c.id === btn.dataset.id);
      if (cat) openCategoryModal(cat);
    });
  });

  grid.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      const count = products.filter(p => p.category === btn.dataset.id).length;
      document.getElementById('delete-message').textContent = `Delete "${btn.dataset.name}"? This will also remove ${count} product(s) in this category.`;
      deleteCallback = () => {
        Store.deleteCategory(btn.dataset.id);
        renderCategoriesGrid();
        renderProductsTable();
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
  document.getElementById('btn-save-hero').addEventListener('click', () => {
    Store.setHero({
      tagline: document.getElementById('hero-tagline-input').value,
      subtitle: document.getElementById('hero-subtitle-input').value,
    });
    showToast('Hero content saved!', 'success');
  });

  document.getElementById('btn-save-about').addEventListener('click', () => {
    Store.setAbout({
      title: document.getElementById('about-title-input').value,
      text: document.getElementById('about-text-input').value,
    });
    showToast('About content saved!', 'success');
  });
}

function loadContentForms() {
  const hero = Store.getHero();
  document.getElementById('hero-tagline-input').value = hero.tagline || '';
  document.getElementById('hero-subtitle-input').value = hero.subtitle || '';

  const about = Store.getAbout();
  document.getElementById('about-title-input').value = about.title || '';
  document.getElementById('about-text-input').value = about.text || '';
}

// ═══════════════════════════════════════════
// DATA MANAGEMENT (Export/Import)
// ═══════════════════════════════════════════
function initDataManagement() {
  document.getElementById('btn-export').addEventListener('click', () => {
    const data = Store.exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `salma-concepts-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Data exported successfully!', 'success');
  });

  document.getElementById('btn-import').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const success = Store.importData(ev.target.result);
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
