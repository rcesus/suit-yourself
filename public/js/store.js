/**
 * SUIT YOURSELF - Store Logic
 * Handles cart management with localStorage and product API calls
 */

const Store = {
  cart: null,
  products: null,
  
  // =================================================================
  // INITIALIZATION
  // =================================================================
  
  init() {
    this.loadCart();
  },
  
  // =================================================================
  // PRODUCT API
  // =================================================================
  
  async getProducts(category = '') {
    const url = category ? `/api/products?category=${category}` : '/api/products';
    const response = await fetch(url);
    this.products = await response.json();
    return this.products;
  },
  
  async getProduct(id) {
    const response = await fetch(`/api/products/${id}`);
    return response.json();
  },
  
  // =================================================================
  // CART - CLIENT-SIDE STORAGE
  // =================================================================
  
  loadCart() {
    try {
      const saved = localStorage.getItem('suityourself_cart');
      if (saved) {
        this.cart = JSON.parse(saved);
      } else {
        this.cart = { items: [], subtotal: 0 };
      }
    } catch (error) {
      console.error('Failed to load cart:', error);
      this.cart = { items: [], subtotal: 0 };
    }
    this.updateCartUI();
  },
  
  saveCart() {
    try {
      localStorage.setItem('suityourself_cart', JSON.stringify(this.cart));
    } catch (error) {
      console.error('Failed to save cart:', error);
    }
  },
  
  getCart() {
    if (!this.cart) {
      this.loadCart();
    }
    return this.cart;
  },
  
  getCartId() {
    // Generate a unique ID for the order
    let cartId = localStorage.getItem('suityourself_cart_id');
    if (!cartId) {
      cartId = 'cart_' + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('suityourself_cart_id', cartId);
    }
    return cartId;
  },
  
  async addToCart(productId, size, quantity = 1) {
    try {
      // Get product details from API
      const product = await this.getProduct(productId);
      if (!product) throw new Error('Product not found');
      
      // Check if item already in cart
      const existingIndex = this.cart.items.findIndex(
        item => item.productId === productId && item.size === size
      );
      
      if (existingIndex >= 0) {
        // Update quantity
        this.cart.items[existingIndex].quantity += quantity;
      } else {
        // Add new item
        this.cart.items.push({
          id: Math.random().toString(16).substring(2, 18),
          productId: product.id,
          name: product.name,
          price: product.price,
          size: size,
          quantity: quantity,
          image: product.images[0]
        });
      }
      
      // Recalculate subtotal
      this.recalculateSubtotal();
      this.saveCart();
      this.updateCartUI();
      
      return this.cart;
    } catch (error) {
      console.error('Failed to add to cart:', error);
      throw error;
    }
  },
  
  removeFromCart(itemId) {
    try {
      this.cart.items = this.cart.items.filter(item => item.id !== itemId);
      this.recalculateSubtotal();
      this.saveCart();
      this.updateCartUI();
      return this.cart;
    } catch (error) {
      console.error('Failed to remove from cart:', error);
      throw error;
    }
  },
  
  updateCartItem(itemId, quantity) {
    try {
      const item = this.cart.items.find(item => item.id === itemId);
      if (item) {
        if (quantity <= 0) {
          return this.removeFromCart(itemId);
        }
        item.quantity = quantity;
        this.recalculateSubtotal();
        this.saveCart();
        this.updateCartUI();
      }
      return this.cart;
    } catch (error) {
      console.error('Failed to update cart:', error);
      throw error;
    }
  },
  
  recalculateSubtotal() {
    this.cart.subtotal = this.cart.items.reduce(
      (sum, item) => sum + (item.price * item.quantity), 
      0
    );
  },
  
  clearCart() {
    this.cart = { items: [], subtotal: 0 };
    localStorage.removeItem('suityourself_cart');
    localStorage.removeItem('suityourself_cart_id');
    this.updateCartUI();
  },
  
  // =================================================================
  // UI UPDATES
  // =================================================================
  
  updateCartUI() {
    // Update cart count in header
    const countEl = document.getElementById('cart-count');
    if (countEl && this.cart) {
      const totalItems = this.cart.items.reduce((sum, item) => sum + item.quantity, 0);
      countEl.textContent = totalItems;
    }
    
    // Update cart drawer
    this.renderCartDrawer();
  },
  
  renderCartDrawer() {
    const itemsEl = document.getElementById('cart-items');
    const footerEl = document.getElementById('cart-footer');
    const subtotalEl = document.getElementById('cart-subtotal');
    
    if (!itemsEl || !this.cart) return;
    
    if (this.cart.items.length === 0) {
      itemsEl.innerHTML = `
        <div class="cart-empty">
          <p>Your bag is empty</p>
          <a href="/products.html" class="btn btn-secondary" style="margin-top: 1rem;">Shop Now</a>
        </div>
      `;
      if (footerEl) footerEl.style.display = 'none';
      return;
    }
    
    itemsEl.innerHTML = this.cart.items.map(item => `
      <div class="cart-item">
        <img src="${item.image}" alt="${item.name}">
        <div class="cart-item-details">
          <h4>${item.name}</h4>
          <p>Size: ${item.size}</p>
          <p class="cart-item-price">$${item.price.toFixed(2)}</p>
          <button class="cart-item-remove" onclick="Store.removeFromCart('${item.id}')">Remove</button>
        </div>
      </div>
    `).join('');
    
    if (footerEl) footerEl.style.display = 'block';
    if (subtotalEl) subtotalEl.textContent = `$${this.cart.subtotal.toFixed(2)}`;
  }
};

// =================================================================
// CART DRAWER FUNCTIONS (Global)
// =================================================================

function openCart() {
  document.getElementById('cart-drawer').classList.add('open');
  document.getElementById('cart-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeCart() {
  document.getElementById('cart-drawer').classList.remove('open');
  document.getElementById('cart-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

function toggleMenu() {
  // Mobile menu toggle - implement as needed
}

// Make Store globally available
window.Store = Store;
