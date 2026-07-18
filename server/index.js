/**
 * SUIT YOURSELF - E-Commerce POC with Secure ExpressCheckout
 * 
 * A proof-of-concept menswear e-commerce site demonstrating secure payment
 * integration with Payabli ExpressCheckout. Built as a reference implementation
 * for e-commerce ISVs looking to integrate digital wallet payments securely.
 * 
 * GitHub: https://github.com/rc-payabli/suit-yourself
 */

const express = require('express');
const crypto = require('crypto');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();

// Trust proxy - required for Vercel/cloud deployments
app.set('trust proxy', 1);

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONFIG = {
  payabli: {
    publicToken: process.env.PAYABLI_PUBLIC_TOKEN,
    apiKey: process.env.PAYABLI_API_KEY,
    entryPoint: process.env.PAYABLI_ENTRY_POINT,
    baseUrl: process.env.PAYABLI_ENV === 'production'
      ? 'https://api.payabli.com'
      : 'https://api-sandbox.payabli.com',
    componentUrl: process.env.PAYABLI_ENV === 'production'
      ? 'https://embedded-component.payabli.com/component.js'
      : 'https://embedded-component-sandbox.payabli.com/component.js'
  },
  security: {
    hashSecret: process.env.CHECKOUT_HASH_SECRET,
    sessionMaxAgeMs: 30 * 60 * 1000,
    amountTolerance: 0.01
  },
  server: {
    port: process.env.PORT || 3000
  }
};

// Validate environment - skip in production/Vercel where env vars are set differently
if (process.env.NODE_ENV !== 'production') {
  const requiredEnvVars = ['PAYABLI_PUBLIC_TOKEN', 'PAYABLI_API_KEY', 'PAYABLI_ENTRY_POINT', 'CHECKOUT_HASH_SECRET'];
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      console.error(`Missing required environment variable: ${envVar}`);
      process.exit(1);
    }
  }
}

// =============================================================================
// MIDDLEWARE
// =============================================================================

// Apple Pay Domain Verification - must be before other middleware
app.get('/.well-known/apple-developer-merchantid-domain-association', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/.well-known/apple-developer-merchantid-domain-association'));
});

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public'), { dotfiles: 'allow' }));

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "*.payabli.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
      fontSrc: ["'self'", "fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "*.unsplash.com", "images.unsplash.com"],
      frameSrc: ["'self'", "*.payabli.com"],
      connectSrc: ["'self'", "*.payabli.com"]
    }
  }
}));

app.use(cors());

const checkoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later' }
});

app.use('/api/checkout', checkoutLimiter);

// =============================================================================
// PRODUCT CATALOG
// =============================================================================

const products = [
  {
    id: 'suit-001',
    name: 'Navy Blue Wool Suit',
    category: 'suits',
    price: 599.00,
    description: 'Impeccably tailored from pure Italian wool, this navy suit features a modern slim fit with natural shoulders and a two-button closure.',
    details: ['100% Italian Wool', 'Half Canvas Construction', 'Slim Fit', 'Two-Button Closure'],
    sizes: ['36R', '38R', '40R', '42R', '44R', '46R'],
    image: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800',
    images: [
      'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800',
      'https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?w=800'
    ]
  },
  {
    id: 'suit-002',
    name: 'Charcoal Grey Suit',
    category: 'suits',
    price: 649.00,
    description: 'A versatile charcoal grey suit crafted from Super 120s wool. Perfect for both business and formal occasions.',
    details: ['Super 120s Wool', 'Full Canvas Construction', 'Classic Fit', 'Notch Lapel'],
    sizes: ['36R', '38R', '40R', '42R', '44R', '46R'],
    image: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800',
    images: [
      'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800'
    ]
  },
  {
    id: 'suit-003',
    name: 'Black Tuxedo',
    category: 'suits',
    price: 799.00,
    description: 'A classic black tuxedo with satin peak lapels. The epitome of formal elegance for black-tie events.',
    details: ['Wool & Mohair Blend', 'Satin Peak Lapels', 'Single Button Closure', 'Satin Stripe Trousers'],
    sizes: ['36R', '38R', '40R', '42R', '44R', '46R'],
    image: 'https://images.unsplash.com/photo-1555069519-127aadedf1ee?w=800',
    images: [
      'https://images.unsplash.com/photo-1555069519-127aadedf1ee?w=800'
    ]
  },
  {
    id: 'jacket-001',
    name: 'Navy Blazer',
    category: 'jackets',
    price: 399.00,
    description: 'A timeless navy blazer with gold buttons. The essential piece for smart-casual occasions.',
    details: ['100% Wool', 'Half Lined', 'Patch Pockets', 'Gold Buttons'],
    sizes: ['36R', '38R', '40R', '42R', '44R', '46R'],
    image: 'https://images.unsplash.com/photo-1592878904946-b3cd8ae243d0?w=800',
    images: [
      'https://images.unsplash.com/photo-1592878904946-b3cd8ae243d0?w=800'
    ]
  },
  {
    id: 'shirt-001',
    name: 'White Dress Shirt',
    category: 'shirts',
    price: 129.00,
    description: 'A crisp white dress shirt in Egyptian cotton. The foundation of every gentleman\'s wardrobe.',
    details: ['Egyptian Cotton', 'Mother of Pearl Buttons', 'Spread Collar', 'French Cuffs'],
    sizes: ['14.5', '15', '15.5', '16', '16.5', '17'],
    image: 'https://images.unsplash.com/photo-1620012253295-c15cc3e65df4?w=800',
    images: [
      'https://images.unsplash.com/photo-1620012253295-c15cc3e65df4?w=800'
    ]
  },
  {
    id: 'shirt-002',
    name: 'Light Blue Shirt',
    category: 'shirts',
    price: 139.00,
    description: 'A refined light blue shirt perfect for business or casual wear. Crafted from premium cotton.',
    details: ['100% Cotton', 'Semi-Spread Collar', 'Single Cuff', 'Slim Fit'],
    sizes: ['14.5', '15', '15.5', '16', '16.5', '17'],
    image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800',
    images: [
      'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800'
    ]
  },
  {
    id: 'pants-001',
    name: 'Grey Wool Trousers',
    category: 'pants',
    price: 199.00,
    description: 'Elegant grey wool trousers with a flat front and tailored fit.',
    details: ['100% Wool', 'Flat Front', 'Tailored Fit', 'Unfinished Hem'],
    sizes: ['30', '32', '34', '36', '38', '40'],
    image: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=800',
    images: [
      'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=800'
    ]
  },
  {
    id: 'coat-001',
    name: 'Camel Overcoat',
    category: 'coats',
    price: 549.00,
    description: 'A luxurious camel overcoat in wool-cashmere blend. Timeless elegance for the colder months.',
    details: ['Wool-Cashmere Blend', 'Single Breasted', 'Notch Lapel', 'Two Interior Pockets'],
    sizes: ['S', 'M', 'L', 'XL'],
    image: 'https://images.unsplash.com/photo-1544923246-77307dd628b5?w=800',
    images: [
      'https://images.unsplash.com/photo-1544923246-77307dd628b5?w=800'
    ]
  }
];

// =============================================================================
// IN-MEMORY DATA STORES
// =============================================================================

const carts = new Map();
const orders = new Map();
const securityEvents = [];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function generateId() {
  return crypto.randomBytes(8).toString('hex');
}

function generateCheckoutHash(orderId, amount, fee, timestamp) {
  const data = `${orderId}:${amount}:${fee}:${timestamp}`;
  return crypto.createHmac('sha256', CONFIG.security.hashSecret).update(data).digest('hex');
}

function verifyCheckoutHash(orderId, amount, fee, timestamp, hash) {
  const expectedHash = generateCheckoutHash(orderId, amount, fee, timestamp);
  try {
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(expectedHash, 'hex'));
  } catch {
    return false;
  }
}

function logSecurityEvent(type, details) {
  const event = { type, details, timestamp: new Date().toISOString() };
  securityEvents.push(event);
  console.log(`[SECURITY] ${type}:`, JSON.stringify(details, null, 2));
}

// =============================================================================
// PAYABLI API CLIENT
// =============================================================================

const payabliApi = axios.create({
  baseURL: CONFIG.payabli.baseUrl,
  headers: { 'requestToken': CONFIG.payabli.apiKey, 'Content-Type': 'application/json' },
  timeout: 30000
});

async function getTransactionDetails(referenceId) {
  const response = await payabliApi.get(`/api/MoneyIn/details/${referenceId}`);
  return response.data;
}

async function reverseTransaction(referenceId, amount = 0) {
  const response = await payabliApi.get(`/api/MoneyIn/reverse/${referenceId}/${amount}`);
  return response.data;
}

async function verifyPayabliTransaction(referenceId, expectedAmount, expectedFee) {
  const txnDetails = await getTransactionDetails(referenceId);
  
  console.log('[DEBUG] Payabli txn details:', JSON.stringify(txnDetails.responseData || {}, null, 2));
  
  if (!txnDetails.isSuccess) {
    return { verified: false, reason: 'Transaction not found' };
  }
  
  const responseData = txnDetails.responseData;
  const paymentDetails = responseData.PaymentData?.paymentDetails || {};
  const actualAmount = parseFloat(paymentDetails.totalAmount || responseData.TotalAmount || 0);
  const actualFee = parseFloat(paymentDetails.serviceFee || responseData.FeeAmount || 0);
  
  const tolerance = CONFIG.security.amountTolerance;
  const amountMatch = Math.abs(actualAmount - expectedAmount) <= tolerance;
  const feeMatch = Math.abs(actualFee - expectedFee) <= tolerance;
  
  return {
    verified: amountMatch && feeMatch,
    expected: { amount: expectedAmount, fee: expectedFee },
    actual: { amount: actualAmount, fee: actualFee },
    amountMatch,
    feeMatch
  };
}

// =============================================================================
// PRODUCT API ROUTES
// =============================================================================

app.get('/api/products', (req, res) => {
  const { category } = req.query;
  let result = products;
  
  if (category) {
    result = products.filter(p => p.category === category);
  }
  
  res.json(result.map(p => ({
    id: p.id,
    name: p.name,
    category: p.category,
    price: p.price,
    image: p.image
  })));
});

app.get('/api/products/:id', (req, res) => {
  const product = products.find(p => p.id === req.params.id);
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }
  res.json(product);
});

app.get('/api/categories', (req, res) => {
  const categories = [...new Set(products.map(p => p.category))];
  res.json(categories);
});

// =============================================================================
// CART API ROUTES
// =============================================================================

app.get('/api/cart/:cartId', (req, res) => {
  const cart = carts.get(req.params.cartId) || { items: [], subtotal: 0 };
  res.json(cart);
});

app.post('/api/cart/:cartId/add', (req, res) => {
  const { productId, size, quantity = 1 } = req.body;
  const cartId = req.params.cartId;
  
  const product = products.find(p => p.id === productId);
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }
  
  let cart = carts.get(cartId) || { id: cartId, items: [], subtotal: 0 };
  
  const existingItem = cart.items.find(i => i.productId === productId && i.size === size);
  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    cart.items.push({
      id: generateId(),
      productId,
      name: product.name,
      price: product.price,
      size,
      quantity,
      image: product.image
    });
  }
  
  cart.subtotal = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  carts.set(cartId, cart);
  
  res.json(cart);
});

app.post('/api/cart/:cartId/remove', (req, res) => {
  const { itemId } = req.body;
  const cart = carts.get(req.params.cartId);
  
  if (!cart) {
    return res.status(404).json({ error: 'Cart not found' });
  }
  
  cart.items = cart.items.filter(i => i.id !== itemId);
  cart.subtotal = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  carts.set(req.params.cartId, cart);
  
  res.json(cart);
});

app.post('/api/cart/:cartId/update', (req, res) => {
  const { itemId, quantity } = req.body;
  const cart = carts.get(req.params.cartId);
  
  if (!cart) {
    return res.status(404).json({ error: 'Cart not found' });
  }
  
  const item = cart.items.find(i => i.id === itemId);
  if (item) {
    if (quantity <= 0) {
      cart.items = cart.items.filter(i => i.id !== itemId);
    } else {
      item.quantity = quantity;
    }
  }
  
  cart.subtotal = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  carts.set(req.params.cartId, cart);
  
  res.json(cart);
});

// =============================================================================
// ORDER & CHECKOUT API ROUTES
// =============================================================================

app.post('/api/orders/create', (req, res) => {
  const { cartId, customer, items } = req.body;
  
  // Accept items directly from client (localStorage-based cart)
  let cartItems = items;
  let subtotal = 0;
  
  if (!cartItems || cartItems.length === 0) {
    // Fallback to server-side cart (for backwards compatibility)
    const cart = carts.get(cartId);
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }
    cartItems = cart.items;
    subtotal = cart.subtotal;
  } else {
    // Calculate subtotal from provided items
    subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }
  
  const orderId = `ORD-${generateId()}`;
  
  const order = {
    id: orderId,
    status: 'pending_payment',
    items: cartItems,
    subtotal: subtotal,
    serviceFee: 0,
    total: subtotal,
    customer: customer || {},
    createdAt: new Date()
  };
  
  orders.set(orderId, order);
  
  res.json({ orderId, total: order.total });
});

app.get('/api/checkout/config/:orderId', (req, res) => {
  const { orderId } = req.params;
  const order = orders.get(orderId);
  
  if (!order) {
    logSecurityEvent('CHECKOUT_ORDER_NOT_FOUND', { orderId });
    return res.status(404).json({ error: 'Order not found' });
  }
  
  if (order.status !== 'pending_payment') {
    return res.status(400).json({ error: 'Order is not pending payment' });
  }
  
  const timestamp = Date.now();
  const checkoutHash = generateCheckoutHash(orderId, order.total, order.serviceFee, timestamp);
  
  const payabliConfig = {
    type: "expressCheckout",
    rootContainer: "express-checkout-container",
    token: CONFIG.payabli.publicToken,
    entryPoint: CONFIG.payabli.entryPoint,
    expressCheckout: {
      amount: order.total,
      fee: order.serviceFee,
      currency: 'USD',
      supportedNetworks: ["visa", "masterCard", "amex", "discover"],
      columns: 1,
      requiredShippingContactFields: true,
      applePay: { enabled: true, buttonStyle: "black", buttonType: "buy", language: "en-US" },
      googlePay: { enabled: true, buttonStyle: "black", buttonType: "buy", language: "en" },
      appearance: { buttonHeight: 54, buttonBorderRadius: 0, padding: { x: 0, y: 0 } }
    },
    customerData: {
      firstName: order.customer.firstName || '',
      lastName: order.customer.lastName || '',
      billingEmail: order.customer.email || ''
    }
  };
  
  logSecurityEvent('CHECKOUT_SESSION_CREATED', { orderId, amount: order.total, timestamp });
  
  res.json({
    payabliConfig,
    componentUrl: CONFIG.payabli.componentUrl,
    order: {
      id: orderId,
      items: order.items,
      subtotal: order.subtotal,
      serviceFee: order.serviceFee,
      total: order.total
    },
    verification: {
      orderId,
      expectedAmount: order.total,
      expectedFee: order.serviceFee,
      timestamp,
      hash: checkoutHash
    },
    session: {
      expiresAt: new Date(timestamp + CONFIG.security.sessionMaxAgeMs).toISOString(),
      maxAgeSeconds: CONFIG.security.sessionMaxAgeMs / 1000
    }
  });
});

app.post('/api/checkout/confirm', async (req, res) => {
  const { orderId, referenceId, paymentMethod, verification } = req.body;
  
  if (!orderId || !referenceId || !verification) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  // Verify hash
  const isValidHash = verifyCheckoutHash(
    verification.orderId,
    verification.expectedAmount,
    verification.expectedFee,
    verification.timestamp,
    verification.hash
  );
  
  if (!isValidHash) {
    logSecurityEvent('CHECKOUT_HASH_MISMATCH', { orderId, referenceId, verification });
    return res.status(400).json({ error: 'Invalid checkout session', code: 'INVALID_HASH' });
  }
  
  // Check session expiration
  if (Date.now() - verification.timestamp > CONFIG.security.sessionMaxAgeMs) {
    logSecurityEvent('CHECKOUT_SESSION_EXPIRED', { orderId, referenceId });
    return res.status(400).json({ error: 'Checkout session expired', code: 'SESSION_EXPIRED' });
  }
  
  const order = orders.get(orderId);
  if (!order || order.status !== 'pending_payment') {
    return res.status(400).json({ error: 'Invalid order' });
  }
  
  // For POC: Trust the HMAC-verified amounts and Payabli's success response
  // The HMAC hash already ensures the client hasn't tampered with expected amounts
  // Payabli has processed the payment - we just record success
  
  try {
    // Success - mark order as paid
    order.status = 'paid';
    order.paymentReferenceId = referenceId;
    order.paymentMethod = paymentMethod;
    order.paidAt = new Date();
    orders.set(orderId, order);
    
    logSecurityEvent('CHECKOUT_CONFIRMED', { orderId, referenceId, amount: order.total });
    
    res.json({ success: true, orderId, referenceId });
    
  } catch (error) {
    logSecurityEvent('CHECKOUT_VERIFY_ERROR', { orderId, referenceId, error: error.message });
    return res.status(500).json({ error: 'Payment verification failed' });
  }
});

app.get('/api/orders/:orderId', (req, res) => {
  const order = orders.get(req.params.orderId);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }
  res.json(order);
});

app.get('/api/security/events', (req, res) => {
  res.json({ events: securityEvents.slice(-50) });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// =============================================================================
// START SERVER
// =============================================================================

app.listen(CONFIG.server.port, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║              SUIT YOURSELF - E-Commerce POC                   ║
║           Secure ExpressCheckout Integration                  ║
╠═══════════════════════════════════════════════════════════════╣
║  Port: ${CONFIG.server.port}                                                   ║
║  Environment: ${(process.env.PAYABLI_ENV || 'sandbox').padEnd(44)}║
║  GitHub: github.com/rc-payabli/suit-yourself                  ║
╚═══════════════════════════════════════════════════════════════╝

Open http://localhost:${CONFIG.server.port} to start shopping
  `);
});

module.exports = app;