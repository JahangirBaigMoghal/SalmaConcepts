/**
 * Salma Concepts — Customer-Facing Application
 */
import './styles/variables.css';
import './styles/base.css';
import './styles/animations.css';
import './styles/hero.css';
import './styles/gallery.css';
import './styles/about.css';
import './styles/contact.css';

import { Store } from './data/store.js';
import { seedData } from './data/seed.js';
import { getWhatsAppLink, getWhatsAppGeneralLink, WHATSAPP_ICON_SVG } from './utils/whatsapp.js';

// ── Local cache for real-time data ──
let cachedProducts = [];
let cachedCategories = [];

// Initialize seed data on first load, then boot the app
(async () => {
  await seedData();

  // Pre-fetch data before DOM is ready
  [cachedProducts, cachedCategories] = await Promise.all([
    Store.getProducts(),
    Store.getCategories(),
  ]);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

function boot() {
  initNavbar();
  initHero();
  initGallery();
  initAbout();
  initContact();
  initScrollAnimations();
  initParticles();
  initLightbox();

  // Real-time listeners — update the gallery live when admin changes data
  Store.onProductsChange(products => {
    cachedProducts = products;
    renderProducts();
  });
  Store.onCategoriesChange(categories => {
    cachedCategories = categories;
    renderCategoryTabs();
    renderProducts();
  });
}

// ═══════════════════════════════════════════
// NAVBAR
// ═══════════════════════════════════════════
function initNavbar() {
  const navbar = document.getElementById('navbar');
  const hamburger = document.getElementById('nav-hamburger');
  const mobileOverlay = document.getElementById('nav-mobile-overlay');

  // Scroll effect
  window.addEventListener('scroll', () => {
    if (window.scrollY > 80) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  });

  // Mobile menu
  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    mobileOverlay.classList.toggle('active');
    document.body.style.overflow = mobileOverlay.classList.contains('active') ? 'hidden' : '';
  });

  // Close mobile menu on link click
  mobileOverlay.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('active');
      mobileOverlay.classList.remove('active');
      document.body.style.overflow = '';
    });
  });
}

// ═══════════════════════════════════════════
// HERO
// ═══════════════════════════════════════════
async function initHero() {
  const heroData = await Store.getHero();

  // Set tagline & subtitle from store
  const taglineEl = document.getElementById('hero-tagline');
  const subtitleEl = document.getElementById('hero-subtitle');
  if (taglineEl && heroData.tagline) taglineEl.textContent = heroData.tagline;
  if (subtitleEl && heroData.subtitle) subtitleEl.textContent = heroData.subtitle;

  // Parallax effect
  window.addEventListener('scroll', () => {
    const scrolled = window.scrollY;
    const heroBg = document.querySelector('.hero-bg');
    if (heroBg && scrolled < window.innerHeight) {
      heroBg.style.transform = `scale(1.05) translateY(${scrolled * 0.3}px)`;
    }
  });
}

// ═══════════════════════════════════════════
// PRODUCT GALLERY
// ═══════════════════════════════════════════
let activeCategory = 'all';

function initGallery() {
  renderCategoryTabs();
  renderProducts();
}

function renderCategoryTabs() {
  const tabsContainer = document.getElementById('category-tabs');
  // Only show visible categories on the customer site
  const categories = cachedCategories.filter(c => !c.hidden);

  // If activeCategory is no longer visible, reset to 'all'
  if (activeCategory !== 'all' && !categories.some(c => c.id === activeCategory)) {
    activeCategory = 'all';
  }

  let html = `<button class="category-tab active" data-category="all">All</button>`;
  categories.forEach(cat => {
    html += `<button class="category-tab${activeCategory === cat.id ? ' active' : ''}" data-category="${cat.id}">${cat.name}</button>`;
  });
  tabsContainer.innerHTML = html;

  // Remove 'active' from all, then set the correct one
  tabsContainer.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
  const activeTab = tabsContainer.querySelector(`[data-category="${activeCategory}"]`);
  if (activeTab) activeTab.classList.add('active');

  // Tab click handlers
  tabsContainer.querySelectorAll('.category-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      activeCategory = tab.dataset.category;
      tabsContainer.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderProducts();
    });
  });
}

function renderProducts() {
  const grid = document.getElementById('product-grid');
  
  // Filter: only show products that are not hidden AND belong to a visible category
  const visibleCategories = cachedCategories.filter(c => !c.hidden);
  const visibleCatIds = visibleCategories.map(c => c.id);
  
  let products = cachedProducts.filter(p => !p.hidden && visibleCatIds.includes(p.category));
  
  if (activeCategory && activeCategory !== 'all') {
    products = products.filter(p => p.category === activeCategory);
  }

  if (products.length === 0) {
    grid.innerHTML = `
      <div class="gallery-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"/>
        </svg>
        <p>No products in this collection yet.</p>
      </div>`;
    return;
  }

  grid.innerHTML = products.map((product, index) => {
    const cat = visibleCategories.find(c => c.id === product.category);
    const catName = cat ? cat.name : product.category;
    const waLink = getWhatsAppLink(product.name, product.price, product.image);
    const staggerClass = `stagger-${(index % 9) + 1}`;

    const isSoldOut = product.soldOut;
    const primaryImage = product.images && product.images.length > 0 ? product.images[0] : product.image;
    const soldOutBadge = isSoldOut ? `<div class="product-sold-out-badge">Sold Out</div>` : '';
    
    let waButtonHtml = '';
    if (isSoldOut) {
      waButtonHtml = `
          <button class="btn btn-whatsapp btn-disabled" disabled>
            Sold Out
          </button>`;
    } else {
      waButtonHtml = `
          <a href="${waLink}" target="_blank" rel="noopener noreferrer" class="btn btn-whatsapp" id="wa-btn-${product.id}">
            ${WHATSAPP_ICON_SVG}
            Order via WhatsApp
          </a>`;
    }

    return `
      <div class="product-card reveal ${staggerClass}" data-id="${product.id}">
        <div class="product-card-image" data-product-id="${product.id}">
          ${soldOutBadge}
          <img src="${primaryImage}" alt="${product.name}" loading="lazy" />
        </div>
        <div class="product-card-body">
          <div class="product-card-category">${catName}</div>
          <h3 class="product-card-name">${product.name}</h3>
          <div class="product-card-price">£${product.price}</div>
          ${waButtonHtml}
        </div>
      </div>`;
  }).join('');

  // Attach lightbox click handlers to product images
  grid.querySelectorAll('.product-card-image').forEach(imgWrapper => {
    imgWrapper.addEventListener('click', () => {
      openLightbox(imgWrapper.dataset.productId);
    });
  });

  // Re-trigger scroll animations for new items
  setTimeout(() => initScrollAnimations(), 50);
}

// ═══════════════════════════════════════════
// ABOUT SECTION
// ═══════════════════════════════════════════
async function initAbout() {
  const aboutData = await Store.getAbout();
  const titleEl = document.getElementById('about-title');
  const textEl = document.getElementById('about-text');

  if (titleEl && aboutData.title) titleEl.textContent = aboutData.title;
  if (textEl && aboutData.text) {
    textEl.innerHTML = aboutData.text.split('\n\n').map(p => `<p>${p}</p>`).join('');
  }
}

// ═══════════════════════════════════════════
// CONTACT SECTION
// ═══════════════════════════════════════════
function initContact() {
  const waBtn = document.getElementById('contact-whatsapp-btn');
  if (waBtn) {
    waBtn.href = getWhatsAppGeneralLink();
  }
}

// ═══════════════════════════════════════════
// SCROLL ANIMATIONS
// ═══════════════════════════════════════════
function initScrollAnimations() {
  const reveals = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  reveals.forEach(el => {
    if (!el.classList.contains('revealed')) {
      observer.observe(el);
    }
  });
}

// ═══════════════════════════════════════════
// HERO PARTICLES
// ═══════════════════════════════════════════
function initParticles() {
  const container = document.getElementById('hero-particles');
  if (!container) return;

  for (let i = 0; i < 20; i++) {
    const particle = document.createElement('div');
    particle.classList.add('particle');
    particle.style.left = `${Math.random() * 100}%`;
    particle.style.top = `${Math.random() * 100}%`;
    particle.style.animationDelay = `${Math.random() * 4}s`;
    particle.style.animationDuration = `${3 + Math.random() * 3}s`;
    container.appendChild(particle);
  }
}

// ═══════════════════════════════════════════
// IMAGE LIGHTBOX
// ═══════════════════════════════════════════
let currentLightboxImages = [];
let currentLightboxIndex = 0;

function initLightbox() {
  const overlay = document.getElementById('lightbox-overlay');
  const closeBtn = document.getElementById('lightbox-close');
  const prevBtn = document.getElementById('lightbox-prev');
  const nextBtn = document.getElementById('lightbox-next');
  if (!overlay || !closeBtn) return;

  // Close on X button
  closeBtn.addEventListener('click', closeLightbox);

  // Close on overlay background click (not the image itself)
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeLightbox();
  });

  // Close on Escape key or navigate with arrows
  document.addEventListener('keydown', (e) => {
    if (overlay.classList.contains('active')) {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') showLightboxImage(currentLightboxIndex - 1);
      if (e.key === 'ArrowRight') showLightboxImage(currentLightboxIndex + 1);
    }
  });

  if (prevBtn) {
    prevBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      showLightboxImage(currentLightboxIndex - 1);
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      showLightboxImage(currentLightboxIndex + 1);
    });
  }
}

function openLightbox(productId) {
  const product = cachedProducts.find(p => p.id === productId);
  if (!product) return;

  currentLightboxImages = product.images && product.images.length > 0 ? product.images : [product.image];
  currentLightboxIndex = 0;

  const captionEl = document.getElementById('lightbox-caption');
  captionEl.textContent = product.name || '';

  showLightboxImage(0);

  const overlay = document.getElementById('lightbox-overlay');
  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function showLightboxImage(index) {
  if (currentLightboxImages.length === 0) return;
  if (index < 0) index = currentLightboxImages.length - 1;
  if (index >= currentLightboxImages.length) index = 0;
  
  currentLightboxIndex = index;
  const img = document.getElementById('lightbox-img');
  img.src = currentLightboxImages[currentLightboxIndex];

  const prevBtn = document.getElementById('lightbox-prev');
  const nextBtn = document.getElementById('lightbox-next');
  
  if (currentLightboxImages.length > 1) {
    if (prevBtn) prevBtn.style.display = 'block';
    if (nextBtn) nextBtn.style.display = 'block';
  } else {
    if (prevBtn) prevBtn.style.display = 'none';
    if (nextBtn) nextBtn.style.display = 'none';
  }
}

function closeLightbox() {
  const overlay = document.getElementById('lightbox-overlay');
  overlay.classList.remove('active');
  document.body.style.overflow = '';
}
