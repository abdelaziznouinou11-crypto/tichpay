# TichPay - Payment Links & Invoicing Platform 🚀

TichPay is a professional FinTech platform designed to simplify payment collection and invoicing for small businesses and freelancers.

## ✨ Features
- **Smart Dashboard:** Real-time analytics (Revenue, Clicks, Conversion).
- **Stripe Integration:** Create and manage professional payment links.
- **Invoicing System:** Generate and download professional PDF invoices.
- **Tax Reports:** Automated tax reporting for accounting.
- **Modern UI:** Built with React and Tailwind CSS.

## 🚀 Deployment on Railway.app
1. Connect your GitHub repository to Railway.
2. Add the following Environment Variables:
   - `PORT`: 3000
   - `STRIPE_SECRET_KEY`: Your Stripe Secret Key
   - `STRIPE_WEBHOOK_SECRET`: Your Stripe Webhook Secret
   - `RESEND_API_KEY`: Your Resend API Key
   - `JWT_SECRET`: A random secure string
3. Railway will automatically detect the `Procfile` and start the server.

## 🛠️ Tech Stack
- **Backend:** Node.js, Express
- **Frontend:** React, TypeScript, Tailwind CSS
- **Database:** SQLite (can be migrated to MySQL/PostgreSQL)
- **Payments:** Stripe API
- **Emails:** Resend API

---
Built with ❤️ for abdelaziznouinou11-crypto
