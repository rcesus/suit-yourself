# Suit Yourself

A simple menswear e-commerce storefront demonstrating Payabli ExpressCheckout integration for Apple Pay and Google Pay.

![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![Express](https://img.shields.io/badge/Express-4.x-lightgrey)

## Overview

Suit Yourself is a streamlined e-commerce reference implementation featuring:

- Product catalog with category filtering (Suits, Jackets, Shirts, Pants, Coats)
- Client-side shopping cart with persistent storage (localStorage)
- Product detail pages with size selection
- Checkout flow with Payabli ExpressCheckout integration
- Order confirmation and email notification

## Quick Start

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Add your Payabli credentials to .env

# Start the development server
npm start

# Open http://localhost:3000
```

## Environment Setup

Create a `.env` file with your Payabli credentials:

```env
PAYABLI_PUBLIC_TOKEN=your-public-token
PAYABLI_API_KEY=your-api-key
PAYABLI_ENTRY_POINT=your-entry-point
PORT=3000
```

Get your credentials from [Payabli PartnerHub](https://partnerhub.payabli.com).

## Project Structure

```
suit-yourself/
├── server/
│   └── index.js              # Express server & API routes
├── public/
│   ├── index.html            # Home page
│   ├── products.html         # Product catalog
│   ├── product.html          # Product detail page
│   ├── email.html            # Checkout & order entry
│   ├── css/
│   │   └── styles.css        # Styling
│   └── js/
│       └── store.js          # Cart management & API integration
├── .env.example
├── package.json
└── README.md
```

## User Flow

1. Browse the product catalog with category filters
2. View product details and select a size
3. Add items to cart (stored locally)
4. Open cart drawer to review items
5. Proceed to checkout
6. Enter email and complete payment via Apple Pay or Google Pay
7. Receive order confirmation

## API Endpoints

### Products
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | List all products |
| GET | `/api/products?category=suits` | Filter by category |
| GET | `/api/products/:id` | Get product details |

### Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/orders` | Create order from cart |
| GET | `/api/orders/:orderId` | Get order details |

### Payment
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/payment/checkout-config` | Get checkout configuration |
| POST | `/api/payment/confirm` | Confirm payment completion |

## Architecture

### Client-Side Cart
- Shopping cart is stored in browser localStorage (`suityourself_cart`)
- Cart persists across page reloads
- Items can be added, removed, or updated in quantity
- Cart drawer provides quick access and management

### Checkout Flow
- Customer enters email on checkout page
- Server generates secure checkout configuration
- Payabli ExpressCheckout renders Apple Pay and Google Pay buttons
- Payment is processed through Payabli
- Order is confirmed upon successful payment

## License

MIT License - See [LICENSE](LICENSE) for details.

---

Built by Payabli Sales Engineering
