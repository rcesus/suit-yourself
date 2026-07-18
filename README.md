# 👔 Suit Yourself

> *Dress how you want. Pay how you want.*

A production-ready e-commerce proof-of-concept demonstrating secure Payabli ExpressCheckout integration with Apple Pay and Google Pay. Built as a reference implementation for e-commerce ISVs looking to integrate digital wallet payments securely.

![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![Express](https://img.shields.io/badge/Express-4.x-lightgrey)
![License](https://img.shields.io/badge/License-MIT-blue)

## 🎯 Purpose

This POC solves a critical security vulnerability in client-side payment integrations: **amount manipulation**. When payment amounts are configured in JavaScript, attackers can modify them via browser dev tools before the transaction processes.

**Suit Yourself** demonstrates a three-layer defense that catches and reverses fraudulent transactions automatically.

## ✨ Features

- **Full E-Commerce Flow** - Product catalog, cart, checkout, order confirmation
- **ExpressCheckout Integration** - Apple Pay & Google Pay digital wallets
- **Amount Manipulation Protection** - Three-layer security implementation
- **Clean, Minimal Design** - Professional menswear aesthetic
- **Production-Ready Patterns** - Rate limiting, security headers, audit logging

## 🔒 Security Implementation

### The Problem

```javascript
// Attacker opens F12 console and runs:
payabliConfig.expressCheckout.amount = 1.00  // Was $599.00
// Completes Apple Pay for $1.00, gets a $599 suit
```

### The Solution

**Layer 1: Server-Generated Configuration**
- Payment amounts originate from server database, not client-side code
- Client receives complete config, never defines the amount

**Layer 2: HMAC Hash Verification**
- Server signs (orderId + amount + timestamp) with secret key
- Any tampering with verification data is detected

**Layer 3: Payabli Transaction Verification**
- After payment, server calls Payabli API to verify actual charged amount
- If mismatch detected, transaction is automatically reversed
- Order remains unpaid, attack logged

```
Expected: $599.00  |  Actually Charged: $1.00
→ MISMATCH DETECTED
→ Transaction reversed
→ Order NOT confirmed
→ Security event logged
```

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/rc-payabli/suit-yourself.git
cd suit-yourself

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your Payabli credentials

# Start server
npm start

# Open browser
open http://localhost:3000
```

## ⚙️ Configuration

Create a `.env` file with your Payabli credentials:

```env
PAYABLI_PUBLIC_TOKEN=your-public-token
PAYABLI_API_KEY=your-api-key
PAYABLI_ENTRY_POINT=your-entry-point
CHECKOUT_HASH_SECRET=random-string-at-least-32-characters
PAYABLI_ENV=sandbox
PORT=3000
```

Get your credentials from [Payabli PartnerHub](https://partnerhub.payabli.com).

## 📁 Project Structure

```
suit-yourself/
├── server/
│   └── index.js           # Express server, API routes, security logic
├── public/
│   ├── index.html         # Home page
│   ├── products.html      # Product catalog
│   ├── product.html       # Product detail
│   ├── checkout.html      # Secure checkout
│   ├── success.html       # Order confirmation
│   ├── css/
│   │   └── styles.css     # All styles
│   └── js/
│       └── store.js       # Cart & API logic
├── .env.example           # Environment template
├── .gitignore
├── package.json
└── README.md
```

## 🛒 User Flow

1. **Browse** - Customer views product catalog
2. **Select** - Choose size, add to cart
3. **Checkout** - Enter contact info, payment buttons appear
4. **Pay** - Complete Apple Pay or Google Pay
5. **Verify** - Server confirms amount with Payabli API
6. **Confirm** - Order confirmed (or reversed if manipulation detected)

## 🔌 API Endpoints

### Products
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | List all products |
| GET | `/api/products?category=suits` | Filter by category |
| GET | `/api/products/:id` | Get product details |

### Cart
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/cart/:cartId` | Get cart contents |
| POST | `/api/cart/:cartId/add` | Add item |
| POST | `/api/cart/:cartId/remove` | Remove item |
| POST | `/api/cart/:cartId/update` | Update quantity |

### Checkout (Secure)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/orders/create` | Create order from cart |
| GET | `/api/checkout/config/:orderId` | Get secure checkout config |
| POST | `/api/checkout/confirm` | Confirm payment with verification |
| GET | `/api/orders/:orderId` | Get order details |

### Monitoring
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/security/events` | View security audit log |
| GET | `/health` | Health check |

## 🧪 Testing the Security

### Without Domain Registration (API Testing)

```bash
# Get checkout config (see server-generated amount)
curl http://localhost:3000/api/checkout/config/ORD-test123

# Attempt tampered confirmation (will fail)
curl -X POST http://localhost:3000/api/checkout/confirm \
  -H "Content-Type: application/json" \
  -d '{"orderId":"ORD-test123","referenceId":"fake","verification":{"expectedAmount":1.00,"hash":"fake"}}'

# Response: {"error":"Invalid checkout session","code":"INVALID_HASH"}
```

### With Domain Registration (Full Test)

1. Open checkout page
2. Press F12, go to Console
3. Run: `payabliConfig.expressCheckout.amount = 1.00`
4. Complete payment
5. Watch server logs for `CHECKOUT_AMOUNT_MANIPULATION` event

## 🏗️ For ISV Integration

This POC demonstrates patterns you can adapt for your platform:

1. **Server-Side Amount Control** - Never trust client-side amounts
2. **Cryptographic Verification** - Sign critical data with HMAC
3. **Post-Payment Verification** - Always confirm with payment provider API
4. **Automatic Remediation** - Reverse fraudulent transactions programmatically
5. **Audit Logging** - Track all security events for monitoring

## 📚 Related Resources

- [Payabli Documentation](https://docs.payabli.com)
- [ExpressCheckout Guide](https://docs.payabli.com/docs/express-checkout)
- [Apple Pay Domain Verification](https://docs.payabli.com/docs/apple-pay-setup)

## 📄 License

MIT License - See [LICENSE](LICENSE) for details.

---

Built with ☕ by [Payabli Sales Engineering](https://payabli.com)
