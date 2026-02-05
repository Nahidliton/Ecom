// Theme Management
class ThemeManager {
    constructor() {
        this.theme = localStorage.getItem('theme') || 'light';
        this.init();
    }

    init() {
        document.documentElement.setAttribute('data-theme', this.theme);
        this.updateToggleButton();
    }

    toggle() {
        this.theme = this.theme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', this.theme);
        localStorage.setItem('theme', this.theme);
        this.updateToggleButton();
    }

    updateToggleButton() {
        const buttons = document.querySelectorAll('.theme-toggle');
        buttons.forEach(btn => {
            const icon = btn.querySelector('i');
            if (icon) {
                icon.className = this.theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
            }
        });
    }
}

// Cart Management
class CartManager {
    constructor() {
        this.cart = JSON.parse(localStorage.getItem('cart')) || [];
        this.init();
    }

    init() {
        this.updateCartCount();
    }

    addToCart(productId, quantity = 1) {
        const existingItem = this.cart.find(item => item.productId === productId);
        
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            this.cart.push({ productId, quantity });
        }
        
        this.saveCart();
        this.updateCartCount();
        this.showNotification('Product added to cart!', 'success');
    }

    removeFromCart(productId) {
        this.cart = this.cart.filter(item => item.productId !== productId);
        this.saveCart();
        this.updateCartCount();
        this.showNotification('Product removed from cart!', 'info');
    }

    updateQuantity(productId, quantity) {
        const item = this.cart.find(item => item.productId === productId);
        if (item) {
            item.quantity = quantity;
            if (quantity <= 0) {
                this.removeFromCart(productId);
            } else {
                this.saveCart();
            }
        }
    }

    getCartCount() {
        return this.cart.reduce((total, item) => total + item.quantity, 0);
    }

    getCartTotal() {
        // This would be calculated with product prices from API
        return this.cart.length * 49.99; // Example calculation
    }

    updateCartCount() {
        const countElements = document.querySelectorAll('.cart-count');
        const count = this.getCartCount();
        
        countElements.forEach(el => {
            el.textContent = count;
            el.style.display = count > 0 ? 'flex' : 'none';
        });
    }

    saveCart() {
        localStorage.setItem('cart', JSON.stringify(this.cart));
    }

    showNotification(message, type = 'info') {
        // Create and show notification
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
            <button class="notification-close">&times;</button>
        `;
        
        document.body.appendChild(notification);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
        
        // Close button
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });
    }
}

// Form Validation
class FormValidator {
    constructor(formId) {
        this.form = document.getElementById(formId);
        if (this.form) {
            this.init();
        }
    }

    init() {
        this.form.addEventListener('submit', (e) => {
            if (!this.validate()) {
                e.preventDefault();
            }
        });
    }

    validate() {
        let isValid = true;
        const inputs = this.form.querySelectorAll('[required]');
        
        inputs.forEach(input => {
            this.clearError(input);
            
            if (!input.value.trim()) {
                this.showError(input, 'This field is required');
                isValid = false;
            } else if (input.type === 'email' && !this.isValidEmail(input.value)) {
                this.showError(input, 'Please enter a valid email');
                isValid = false;
            } else if (input.type === 'password' && input.value.length < 6) {
                this.showError(input, 'Password must be at least 6 characters');
                isValid = false;
            }
        });
        
        return isValid;
    }

    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    showError(input, message) {
        const error = document.createElement('div');
        error.className = 'error-message';
        error.textContent = message;
        error.style.color = 'var(--danger-color)';
        error.style.fontSize = '14px';
        error.style.marginTop = '4px';
        
        input.parentNode.appendChild(error);
        input.classList.add('error');
    }

    clearError(input) {
        const error = input.parentNode.querySelector('.error-message');
        if (error) error.remove();
        input.classList.remove('error');
    }
}

// Product Search and Filter
class ProductFilter {
    constructor() {
        this.products = [];
        this.filters = {
            category: '',
            priceMin: 0,
            priceMax: 1000,
            sortBy: 'popularity'
        };
        
        this.init();
    }

    init() {
        // Initialize event listeners for filter controls
        const categorySelect = document.getElementById('category-filter');
        const priceRange = document.getElementById('price-range');
        const sortSelect = document.getElementById('sort-by');
        
        if (categorySelect) {
            categorySelect.addEventListener('change', (e) => {
                this.filters.category = e.target.value;
                this.applyFilters();
            });
        }
        
        if (priceRange) {
            priceRange.addEventListener('input', (e) => {
                this.filters.priceMax = e.target.value;
                this.updatePriceDisplay();
                this.applyFilters();
            });
        }
        
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.filters.sortBy = e.target.value;
                this.applyFilters();
            });
        }
    }

    async loadProducts() {
        try {
            const response = await fetch('/api/products');
            this.products = await response.json();
            this.renderProducts();
        } catch (error) {
            console.error('Error loading products:', error);
        }
    }

    applyFilters() {
        let filtered = [...this.products];
        
        // Apply category filter
        if (this.filters.category) {
            filtered = filtered.filter(product => 
                product.category === this.filters.category
            );
        }
        
        // Apply price filter
        filtered = filtered.filter(product => 
            product.price >= this.filters.priceMin && 
            product.price <= this.filters.priceMax
        );
        
        // Apply sorting
        filtered = this.sortProducts(filtered, this.filters.sortBy);
        
        this.renderProducts(filtered);
    }

    sortProducts(products, sortBy) {
        switch(sortBy) {
            case 'price-low':
                return products.sort((a, b) => a.price - b.price);
            case 'price-high':
                return products.sort((a, b) => b.price - a.price);
            case 'popularity':
                return products.sort((a, b) => b.sales - a.sales);
            case 'newest':
                return products.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            default:
                return products;
        }
    }

    renderProducts(products = this.products) {
        const container = document.getElementById('products-container');
        if (!container) return;
        
        container.innerHTML = products.map(product => `
            <div class="product-card">
                <div class="product-image">
                    <img src="${product.image}" alt="${product.title}">
                    ${product.discounted_price ? 
                        `<span class="discount-badge">${this.calculateDiscount(product)}% OFF</span>` : ''}
                </div>
                <div class="product-info">
                    <h3 class="product-title">${product.title}</h3>
                    <p class="product-description">${product.short_description}</p>
                    <div class="product-meta">
                        <div class="product-price">
                            ${product.discounted_price ? 
                                `<span class="original-price">$${product.price.toFixed(2)}</span>
                                 <span class="current-price">$${product.discounted_price.toFixed(2)}</span>` :
                                `<span class="current-price">$${product.price.toFixed(2)}</span>`}
                        </div>
                        <button class="btn btn-primary btn-sm add-to-cart" 
                                data-id="${product.id}">
                            <i class="fas fa-cart-plus"></i> Add to Cart
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
        
        // Add event listeners to add-to-cart buttons
        container.querySelectorAll('.add-to-cart').forEach(button => {
            button.addEventListener('click', (e) => {
                const productId = e.target.closest('button').dataset.id;
                cartManager.addToCart(productId);
            });
        });
    }

    calculateDiscount(product) {
        return Math.round(((product.price - product.discounted_price) / product.price) * 100);
    }

    updatePriceDisplay() {
        const display = document.getElementById('price-display');
        if (display) {
            display.textContent = `Up to $${this.filters.priceMax}`;
        }
    }
}

// Mobile Navigation
class MobileNavigation {
    constructor() {
        this.isOpen = false;
        this.init();
    }

    init() {
        this.nav = document.querySelector('.bottom-nav');
        this.menuButton = document.querySelector('.menu-toggle');
        
        if (this.menuButton) {
            this.menuButton.addEventListener('click', () => this.toggleMenu());
        }
        
        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (this.isOpen && !this.nav.contains(e.target) && !this.menuButton.contains(e.target)) {
                this.closeMenu();
            }
        });
    }

    toggleMenu() {
        this.isOpen ? this.closeMenu() : this.openMenu();
    }

    openMenu() {
        this.nav.classList.add('active');
        this.isOpen = true;
        document.body.style.overflow = 'hidden';
    }

    closeMenu() {
        this.nav.classList.remove('active');
        this.isOpen = false;
        document.body.style.overflow = '';
    }
}

// Initialize all components when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize theme manager
    const themeManager = new ThemeManager();
    
    // Initialize cart manager
    const cartManager = new CartManager();
    
    // Initialize form validators
    const loginValidator = new FormValidator('login-form');
    const registerValidator = new FormValidator('register-form');
    const checkoutValidator = new FormValidator('checkout-form');
    
    // Initialize product filter
    const productFilter = new ProductFilter();
    
    // Initialize mobile navigation
    if (window.innerWidth <= 768) {
        new MobileNavigation();
    }
    
    // Theme toggle buttons
    document.querySelectorAll('.theme-toggle').forEach(btn => {
        btn.addEventListener('click', () => themeManager.toggle());
    });
    
    // Add to cart buttons
    document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const productId = e.target.dataset.id || e.target.closest('button').dataset.id;
            cartManager.addToCart(productId);
        });
    });
    
    // Quantity controls
    document.querySelectorAll('.quantity-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const input = e.target.parentNode.querySelector('.quantity-input');
            const currentValue = parseInt(input.value);
            
            if (e.target.classList.contains('decrease')) {
                input.value = Math.max(1, currentValue - 1);
            } else {
                input.value = currentValue + 1;
            }
            
            // Update cart if on cart page
            const productId = input.dataset.productId;
            if (productId) {
                cartManager.updateQuantity(productId, parseInt(input.value));
            }
        });
    });
    
    // FAQ accordion
    document.querySelectorAll('.faq-question').forEach(question => {
        question.addEventListener('click', () => {
            const answer = question.nextElementSibling;
            const icon = question.querySelector('i');
            
            answer.classList.toggle('active');
            icon.classList.toggle('fa-chevron-down');
            icon.classList.toggle('fa-chevron-up');
        });
    });
    
    // Payment method selection
    document.querySelectorAll('.payment-method').forEach(method => {
        method.addEventListener('click', () => {
            document.querySelectorAll('.payment-method').forEach(m => {
                m.classList.remove('active');
            });
            method.classList.add('active');
            
            // Show/hide payment form based on selection
            const paymentType = method.dataset.type;
            document.querySelectorAll('.payment-form').forEach(form => {
                form.classList.add('d-none');
            });
            document.getElementById(`${paymentType}-form`)?.classList.remove('d-none');
        });
    });
    
    // Image gallery for product detail
    const galleryImages = document.querySelectorAll('.gallery-thumbnail');
    const mainImage = document.getElementById('main-product-image');
    
    if (galleryImages.length > 0 && mainImage) {
        galleryImages.forEach(img => {
            img.addEventListener('click', () => {
                // Update main image
                mainImage.src = img.src;
                
                // Update active thumbnail
                galleryImages.forEach(i => i.classList.remove('active'));
                img.classList.add('active');
            });
        });
    }
    
    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // Lazy loading for images
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.remove('lazy');
                    imageObserver.unobserve(img);
                }
            });
        });
        
        document.querySelectorAll('img.lazy').forEach(img => {
            imageObserver.observe(img);
        });
    }
    
    // Responsive table for mobile
    function makeTableResponsive() {
        const tables = document.querySelectorAll('table');
        tables.forEach(table => {
            const wrapper = document.createElement('div');
            wrapper.className = 'table-responsive';
            table.parentNode.insertBefore(wrapper, table);
            wrapper.appendChild(table);
        });
    }
    
    makeTableResponsive();
    
    // Update cart count on page load
    cartManager.updateCartCount();
});

// Window resize handling
window.addEventListener('resize', () => {
    // Update any responsive behaviors
    cartManager.updateCartCount();
});

// Service Worker for PWA functionality (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('ServiceWorker registered:', registration);
            })
            .catch(error => {
                console.log('ServiceWorker registration failed:', error);
            });
    });
}