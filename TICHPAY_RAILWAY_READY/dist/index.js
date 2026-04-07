// server/env.ts
import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.join(process.cwd(), ".env") });
var env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: parseInt(process.env.PORT || "3000", 10),
  APP_URL: process.env.APP_URL || "http://localhost:3000",
  // Stripe
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || "",
  STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY || "",
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || "",
  // Resend
  RESEND_API_KEY: process.env.RESEND_API_KEY || "",
  // Email
  FROM_EMAIL: process.env.FROM_EMAIL || "noreply@tichpay.app",
  SUPPORT_EMAIL: process.env.SUPPORT_EMAIL || "support@tichpay.app",
  // Database
  DATABASE_URL: process.env.DATABASE_URL || "",
  DATABASE_PATH: process.env.DATABASE_PATH || path.join(process.cwd(), "data", "tichpay.db"),
  // JWT
  JWT_SECRET: process.env.JWT_SECRET || "default_secret_change_in_production"
};

// server/index.ts
import express2 from "express";
import cors from "cors";
import * as path5 from "path";
import { fileURLToPath as fileURLToPath2 } from "url";

// server/routes/payments.ts
import { Router } from "express";

// server/services/stripe.ts
import Stripe from "stripe";
var stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-12-18.acacia"
});
async function createPaymentLink(params) {
  try {
    const product = await stripe.products.create({
      name: params.description,
      metadata: params.metadata || {}
    });
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: Math.round(params.amount * 100),
      // Convert to cents
      currency: params.currency.toLowerCase()
    });
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [
        {
          price: price.id,
          quantity: 1
        }
      ],
      metadata: params.metadata || {}
    });
    return {
      success: true,
      paymentLink: paymentLink.url,
      paymentLinkId: paymentLink.id,
      productId: product.id,
      priceId: price.id
    };
  } catch (error) {
    console.error("Stripe Payment Link Error:", error);
    return {
      success: false,
      error: error.message
    };
  }
}
async function createCheckoutSession(params) {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: params.currency.toLowerCase(),
            product_data: {
              name: params.description
            },
            unit_amount: Math.round(params.amount * 100)
            // Convert to cents
          },
          quantity: 1
        }
      ],
      mode: "payment",
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: params.metadata || {}
    });
    return {
      success: true,
      sessionId: session.id,
      checkoutUrl: session.url
    };
  } catch (error) {
    console.error("Stripe Checkout Session Error:", error);
    return {
      success: false,
      error: error.message
    };
  }
}
function verifyWebhookSignature(payload, signature, secret) {
  try {
    return stripe.webhooks.constructEvent(payload, signature, secret);
  } catch (error) {
    console.error("Webhook Signature Verification Failed:", error.message);
    return null;
  }
}
async function getPaymentIntent(paymentIntentId) {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return {
      success: true,
      paymentIntent
    };
  } catch (error) {
    console.error("Get Payment Intent Error:", error);
    return {
      success: false,
      error: error.message
    };
  }
}

// server/database/sqlite.ts
import Database from "better-sqlite3";
import * as path2 from "path";
import * as fs from "fs";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path2.dirname(__filename);
var db = null;
function getDatabase() {
  if (!db) {
    const dbPath = env.DATABASE_PATH;
    const dataDir = path2.dirname(dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    console.log(`\u2705 SQLite database connected: ${dbPath}`);
  }
  return db;
}
function initializeDatabase() {
  const db2 = getDatabase();
  db2.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      company_name TEXT,
      company_address TEXT,
      company_email TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  `);
  db2.exec(`
    CREATE TABLE IF NOT EXISTS payment_links (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'USD',
      stripe_payment_link_id TEXT,
      stripe_product_id TEXT,
      stripe_price_id TEXT,
      url TEXT,
      status TEXT DEFAULT 'active',
      clicks INTEGER DEFAULT 0,
      successful_payments INTEGER DEFAULT 0,
      total_revenue REAL DEFAULT 0.0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_payment_links_user_id ON payment_links(user_id);
    CREATE INDEX IF NOT EXISTS idx_payment_links_status ON payment_links(status);
  `);
  db2.exec(`
    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      invoice_number TEXT UNIQUE NOT NULL,
      client_name TEXT NOT NULL,
      client_email TEXT NOT NULL,
      client_address TEXT,
      issue_date DATE NOT NULL,
      due_date DATE NOT NULL,
      subtotal REAL NOT NULL,
      tax REAL DEFAULT 0.0,
      total REAL NOT NULL,
      currency TEXT DEFAULT 'USD',
      status TEXT DEFAULT 'draft',
      notes TEXT,
      stripe_payment_intent_id TEXT,
      paid_at DATETIME,
      sent_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
    CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);
    CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
  `);
  db2.exec(`
    CREATE TABLE IF NOT EXISTS invoice_items (
      id TEXT PRIMARY KEY,
      invoice_id TEXT NOT NULL,
      description TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      rate REAL NOT NULL,
      amount REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
  `);
  db2.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'USD',
      transaction_date DATE NOT NULL,
      invoice_id TEXT,
      payment_link_id TEXT,
      stripe_payment_id TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL,
      FOREIGN KEY (payment_link_id) REFERENCES payment_links(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
  `);
  db2.exec(`
    CREATE TABLE IF NOT EXISTS payment_link_clicks (
      id TEXT PRIMARY KEY,
      payment_link_id TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      referrer TEXT,
      clicked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (payment_link_id) REFERENCES payment_links(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_clicks_payment_link_id ON payment_link_clicks(payment_link_id);
  `);
  db2.exec(`
    CREATE TABLE IF NOT EXISTS webhook_events (
      id TEXT PRIMARY KEY,
      stripe_event_id TEXT UNIQUE NOT NULL,
      event_type TEXT NOT NULL,
      payload TEXT NOT NULL,
      processed INTEGER DEFAULT 0,
      processed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_webhook_events_stripe_event_id ON webhook_events(stripe_event_id);
    CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON webhook_events(processed);
  `);
  db2.exec(`
    CREATE TABLE IF NOT EXISTS tax_reports (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      year INTEGER NOT NULL,
      quarter TEXT NOT NULL,
      total_income REAL NOT NULL,
      total_expenses REAL NOT NULL,
      net_income REAL NOT NULL,
      estimated_tax REAL NOT NULL,
      status TEXT DEFAULT 'draft',
      generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      finalized_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, year, quarter)
    );
    CREATE INDEX IF NOT EXISTS idx_tax_reports_user_id ON tax_reports(user_id);
  `);
  db2.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
  `);
  const userExists = db2.prepare("SELECT id FROM users WHERE id = ?").get("default-user");
  if (!userExists) {
    db2.prepare(`
      INSERT INTO users (id, email, password_hash, name, created_at, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run("default-user", "demo@tichpay.com", "demo-hash", "Demo User");
    console.log("\u2705 Default user created");
  }
  console.log("\u2705 Database schema initialized successfully");
}

// server/routes/payments.ts
var router = Router();
router.get("/links", async (req, res) => {
  try {
    const db2 = getDatabase();
    const links = db2.prepare(`
      SELECT * FROM payment_links 
      ORDER BY created_at DESC
    `).all();
    res.json({
      success: true,
      data: links
    });
  } catch (error) {
    console.error("Error fetching payment links:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch payment links"
    });
  }
});
router.post("/create-link", async (req, res) => {
  try {
    const { amount, currency = "usd", description, metadata } = req.body;
    if (!amount || !description) {
      return res.status(400).json({
        success: false,
        error: "Amount and description are required"
      });
    }
    const result = await createPaymentLink({
      amount: parseFloat(amount),
      currency,
      description,
      metadata: {
        ...metadata,
        userId: req.user?.id || "guest",
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      }
    });
    if (!result.success) {
      return res.status(400).json(result);
    }
    const db2 = getDatabase();
    const linkId = Date.now().toString();
    const userId = "default-user";
    db2.prepare(`
      INSERT INTO payment_links (id, user_id, title, amount, currency, url, status, clicks, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(linkId, userId, description, amount, currency, result.paymentLink || "", "active", 0);
    res.json({
      success: true,
      data: {
        id: linkId,
        title: description,
        amount,
        currency,
        url: result.paymentLink,
        status: "active",
        clicks: 0,
        created_at: (/* @__PURE__ */ new Date()).toISOString()
      }
    });
  } catch (error) {
    console.error("Create Payment Link Error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create payment link"
    });
  }
});
router.post("/create-checkout", async (req, res) => {
  try {
    const { amount, currency = "usd", description, invoiceId } = req.body;
    if (!amount || !description) {
      return res.status(400).json({
        success: false,
        error: "Amount and description are required"
      });
    }
    const baseUrl = process.env.APP_URL || "http://localhost:3000";
    const result = await createCheckoutSession({
      amount: parseFloat(amount),
      currency,
      description,
      successUrl: `${baseUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${baseUrl}/payment-cancelled`,
      metadata: {
        invoiceId: invoiceId || "",
        userId: req.user?.id || "guest"
      }
    });
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (error) {
    console.error("Create Checkout Session Error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create checkout session"
    });
  }
});
router.post("/webhook", async (req, res) => {
  try {
    const signature = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";
    if (!signature) {
      return res.status(400).json({
        success: false,
        error: "Missing stripe-signature header"
      });
    }
    const event = verifyWebhookSignature(
      req.body,
      signature,
      webhookSecret
    );
    if (!event) {
      return res.status(400).json({
        success: false,
        error: "Invalid webhook signature"
      });
    }
    switch (event.type) {
      case "checkout.session.completed":
        const session = event.data.object;
        console.log("Payment successful:", session.id);
        break;
      case "payment_intent.succeeded":
        const paymentIntent = event.data.object;
        console.log("Payment intent succeeded:", paymentIntent.id);
        break;
      case "payment_intent.payment_failed":
        const failedPayment = event.data.object;
        console.log("Payment failed:", failedPayment.id);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
    res.json({ received: true });
  } catch (error) {
    console.error("Webhook Error:", error);
    res.status(500).json({
      success: false,
      error: "Webhook processing failed"
    });
  }
});
router.get("/:paymentIntentId", async (req, res) => {
  try {
    const { paymentIntentId } = req.params;
    const result = await getPaymentIntent(paymentIntentId);
    if (!result.success) {
      return res.status(404).json(result);
    }
    res.json(result);
  } catch (error) {
    console.error("Get Payment Error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to retrieve payment"
    });
  }
});
var payments_default = router;

// server/routes/pdf.ts
import { Router as Router2 } from "express";
import * as path4 from "path";
import * as fs3 from "fs";

// server/services/pdf.ts
import { exec } from "child_process";
import { promisify } from "util";
import * as fs2 from "fs";
import * as path3 from "path";
var execAsync = promisify(exec);
function generateInvoiceHTML(data) {
  const itemsHTML = data.items.map(
    (item) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.description}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${item.rate.toFixed(2)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">$${item.amount.toFixed(2)}</td>
    </tr>
  `
  ).join("");
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice ${data.invoiceNumber}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      margin: 0;
      padding: 40px;
      color: #1f2937;
    }
    .invoice-container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
    }
    .header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 3px solid #3b82f6;
    }
    .company-info h1 {
      margin: 0;
      color: #3b82f6;
      font-size: 32px;
    }
    .invoice-info {
      text-align: right;
    }
    .invoice-info h2 {
      margin: 0 0 10px 0;
      color: #6b7280;
      font-size: 24px;
      font-weight: 400;
    }
    .invoice-number {
      font-size: 18px;
      color: #1f2937;
      font-weight: 600;
    }
    .client-info {
      margin-bottom: 30px;
    }
    .client-info h3 {
      margin: 0 0 10px 0;
      color: #6b7280;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .client-info p {
      margin: 5px 0;
      font-size: 16px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 30px 0;
    }
    th {
      background: #f3f4f6;
      padding: 12px;
      text-align: left;
      font-weight: 600;
      color: #374151;
      border-bottom: 2px solid #e5e7eb;
    }
    th:nth-child(2), th:nth-child(3), th:nth-child(4) {
      text-align: right;
    }
    th:nth-child(2) {
      text-align: center;
    }
    .totals {
      margin-top: 30px;
      text-align: right;
    }
    .totals-row {
      display: flex;
      justify-content: flex-end;
      padding: 8px 0;
    }
    .totals-label {
      width: 150px;
      text-align: right;
      padding-right: 20px;
      color: #6b7280;
    }
    .totals-value {
      width: 120px;
      text-align: right;
      font-weight: 600;
    }
    .total-row {
      border-top: 2px solid #e5e7eb;
      padding-top: 12px;
      margin-top: 12px;
      font-size: 20px;
      color: #3b82f6;
    }
    .notes {
      margin-top: 40px;
      padding: 20px;
      background: #f9fafb;
      border-left: 4px solid #3b82f6;
    }
    .notes h3 {
      margin: 0 0 10px 0;
      color: #374151;
    }
    .notes p {
      margin: 0;
      color: #6b7280;
      line-height: 1.6;
    }
    .footer {
      margin-top: 60px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      color: #9ca3af;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <div class="header">
      <div class="company-info">
        <h1>${data.companyName || "TichPay"}</h1>
        <p>${data.companyAddress || ""}</p>
        <p>${data.companyEmail || "support@tichpay.app"}</p>
      </div>
      <div class="invoice-info">
        <h2>INVOICE</h2>
        <p class="invoice-number">#${data.invoiceNumber}</p>
        <p style="margin-top: 15px;">
          <strong>Date:</strong> ${data.date}<br>
          <strong>Due Date:</strong> ${data.dueDate}
        </p>
      </div>
    </div>

    <div class="client-info">
      <h3>Bill To</h3>
      <p><strong>${data.clientName}</strong></p>
      <p>${data.clientEmail}</p>
    </div>

    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th>Qty</th>
          <th>Rate</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHTML}
      </tbody>
    </table>

    <div class="totals">
      <div class="totals-row">
        <div class="totals-label">Subtotal:</div>
        <div class="totals-value">$${data.subtotal.toFixed(2)}</div>
      </div>
      ${data.tax ? `
      <div class="totals-row">
        <div class="totals-label">Tax:</div>
        <div class="totals-value">$${data.tax.toFixed(2)}</div>
      </div>
      ` : ""}
      <div class="totals-row total-row">
        <div class="totals-label">Total:</div>
        <div class="totals-value">$${data.total.toFixed(2)}</div>
      </div>
    </div>

    ${data.notes ? `
    <div class="notes">
      <h3>Notes</h3>
      <p>${data.notes}</p>
    </div>
    ` : ""}

    <div class="footer">
      <p>Thank you for your business!</p>
      <p>Generated by TichPay - FinTech for Freelancers</p>
    </div>
  </div>
</body>
</html>
  `;
}
function generateTaxReportHTML(data) {
  const incomeHTML = data.incomeByCategory.map(
    (item) => `
    <tr>
      <td style="padding: 8px;">${item.category}</td>
      <td style="padding: 8px; text-align: right;">$${item.amount.toFixed(2)}</td>
      <td style="padding: 8px; text-align: right;">${item.percentage.toFixed(1)}%</td>
    </tr>
  `
  ).join("");
  const expensesHTML = data.expensesByCategory.map(
    (item) => `
    <tr>
      <td style="padding: 8px;">${item.category}</td>
      <td style="padding: 8px; text-align: right;">$${item.amount.toFixed(2)}</td>
      <td style="padding: 8px; text-align: right;">${item.percentage.toFixed(1)}%</td>
    </tr>
  `
  ).join("");
  const transactionsHTML = data.transactions.map(
    (tx) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${tx.date}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${tx.description}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${tx.category}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right; color: ${tx.type === "income" ? "#10b981" : "#ef4444"};">
        ${tx.type === "income" ? "+" : "-"}$${Math.abs(tx.amount).toFixed(2)}
      </td>
    </tr>
  `
  ).join("");
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Tax Report ${data.year}${data.quarter ? ` - ${data.quarter}` : ""}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      margin: 0;
      padding: 40px;
      color: #1f2937;
    }
    .report-container {
      max-width: 900px;
      margin: 0 auto;
      background: white;
    }
    h1 {
      color: #3b82f6;
      margin-bottom: 10px;
    }
    .period {
      color: #6b7280;
      font-size: 18px;
      margin-bottom: 30px;
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
      margin-bottom: 40px;
    }
    .summary-card {
      padding: 20px;
      background: #f9fafb;
      border-left: 4px solid #3b82f6;
      border-radius: 4px;
    }
    .summary-card h3 {
      margin: 0 0 8px 0;
      font-size: 14px;
      color: #6b7280;
      text-transform: uppercase;
    }
    .summary-card .value {
      font-size: 24px;
      font-weight: 700;
      color: #1f2937;
    }
    .section {
      margin-bottom: 40px;
    }
    .section h2 {
      color: #374151;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 2px solid #e5e7eb;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
    }
    th {
      background: #f3f4f6;
      padding: 10px;
      text-align: left;
      font-weight: 600;
      color: #374151;
    }
    .footer {
      margin-top: 60px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      color: #9ca3af;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="report-container">
    <h1>Tax Report</h1>
    <p class="period">${data.year}${data.quarter ? ` - ${data.quarter}` : " - Full Year"}</p>

    <div class="summary">
      <div class="summary-card">
        <h3>Total Income</h3>
        <div class="value">$${data.totalIncome.toFixed(2)}</div>
      </div>
      <div class="summary-card">
        <h3>Total Expenses</h3>
        <div class="value">$${data.totalExpenses.toFixed(2)}</div>
      </div>
      <div class="summary-card">
        <h3>Net Income</h3>
        <div class="value">$${data.netIncome.toFixed(2)}</div>
      </div>
      <div class="summary-card">
        <h3>Estimated Tax</h3>
        <div class="value">$${data.estimatedTax.toFixed(2)}</div>
      </div>
    </div>

    <div class="section">
      <h2>Income by Category</h2>
      <table>
        <thead>
          <tr>
            <th>Category</th>
            <th style="text-align: right;">Amount</th>
            <th style="text-align: right;">Percentage</th>
          </tr>
        </thead>
        <tbody>
          ${incomeHTML}
        </tbody>
      </table>
    </div>

    <div class="section">
      <h2>Expenses by Category</h2>
      <table>
        <thead>
          <tr>
            <th>Category</th>
            <th style="text-align: right;">Amount</th>
            <th style="text-align: right;">Percentage</th>
          </tr>
        </thead>
        <tbody>
          ${expensesHTML}
        </tbody>
      </table>
    </div>

    <div class="section">
      <h2>Recent Transactions</h2>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Description</th>
            <th>Category</th>
            <th style="text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${transactionsHTML}
        </tbody>
      </table>
    </div>

    <div class="footer">
      <p>Generated by TichPay - FinTech for Freelancers</p>
      <p>This report is for informational purposes only. Please consult with a tax professional.</p>
    </div>
  </div>
</body>
</html>
  `;
}
async function generatePDFFromHTML(html, outputPath) {
  try {
    const tempHTMLPath = path3.join("/tmp", `temp_${Date.now()}.html`);
    fs2.writeFileSync(tempHTMLPath, html);
    await execAsync(
      `wkhtmltopdf --enable-local-file-access --page-size A4 --margin-top 10mm --margin-bottom 10mm --margin-left 10mm --margin-right 10mm "${tempHTMLPath}" "${outputPath}"`
    );
    fs2.unlinkSync(tempHTMLPath);
    return true;
  } catch (error) {
    console.error("PDF Generation Error:", error);
    return false;
  }
}
async function generateInvoicePDF(data, outputPath) {
  const html = generateInvoiceHTML(data);
  return await generatePDFFromHTML(html, outputPath);
}
async function generateTaxReportPDF(data, outputPath) {
  const html = generateTaxReportHTML(data);
  return await generatePDFFromHTML(html, outputPath);
}

// server/routes/pdf.ts
var router2 = Router2();
router2.post("/invoice", async (req, res) => {
  try {
    const invoiceData = req.body;
    if (!invoiceData.invoiceNumber || !invoiceData.clientName) {
      return res.status(400).json({
        success: false,
        error: "Invoice number and client name are required"
      });
    }
    const fileName = `invoice_${invoiceData.invoiceNumber}_${Date.now()}.pdf`;
    const outputPath = path4.join("/tmp", fileName);
    const success = await generateInvoicePDF(invoiceData, outputPath);
    if (!success) {
      return res.status(500).json({
        success: false,
        error: "Failed to generate PDF"
      });
    }
    res.download(outputPath, fileName, (err) => {
      if (fs3.existsSync(outputPath)) {
        fs3.unlinkSync(outputPath);
      }
      if (err) {
        console.error("PDF Download Error:", err);
      }
    });
  } catch (error) {
    console.error("Generate Invoice PDF Error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate invoice PDF"
    });
  }
});
router2.post("/tax-report", async (req, res) => {
  try {
    const reportData = req.body;
    if (!reportData.year) {
      return res.status(400).json({
        success: false,
        error: "Year is required"
      });
    }
    const fileName = `tax_report_${reportData.year}${reportData.quarter ? `_${reportData.quarter}` : ""}_${Date.now()}.pdf`;
    const outputPath = path4.join("/tmp", fileName);
    const success = await generateTaxReportPDF(reportData, outputPath);
    if (!success) {
      return res.status(500).json({
        success: false,
        error: "Failed to generate PDF"
      });
    }
    res.download(outputPath, fileName, (err) => {
      if (fs3.existsSync(outputPath)) {
        fs3.unlinkSync(outputPath);
      }
      if (err) {
        console.error("PDF Download Error:", err);
      }
    });
  } catch (error) {
    console.error("Generate Tax Report PDF Error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate tax report PDF"
    });
  }
});
var pdf_default = router2;

// server/routes/invoices.ts
import express from "express";

// server/services/email.ts
import { Resend } from "resend";
var resend = new Resend(env.RESEND_API_KEY);
var FROM_EMAIL = env.FROM_EMAIL;
async function sendEmail(params) {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      subject: params.subject,
      html: params.html
    });
    if (error) {
      console.error("Resend error:", error);
      return false;
    }
    console.log("\u2705 Email sent successfully:", data);
    return true;
  } catch (error) {
    console.error("Failed to send email:", error);
    return false;
  }
}

// server/routes/invoices.ts
var router3 = express.Router();
router3.get("/", async (req, res) => {
  try {
    const db2 = getDatabase();
    const invoices = db2.prepare(`
      SELECT * FROM invoices 
      ORDER BY created_at DESC
    `).all();
    res.json({
      success: true,
      data: invoices
    });
  } catch (error) {
    console.error("Error fetching invoices:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch invoices"
    });
  }
});
router3.post("/create", async (req, res) => {
  try {
    const { client_name, client_email, amount, issue_date, due_date, items } = req.body;
    if (!client_name || !client_email || !amount || !issue_date || !due_date) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields"
      });
    }
    const db2 = getDatabase();
    const lastInvoice = db2.prepare("SELECT invoice_number FROM invoices ORDER BY created_at DESC LIMIT 1").get();
    let invoiceNumber = "INV-001";
    if (lastInvoice) {
      const lastNum = parseInt(lastInvoice.invoice_number.split("-")[1]);
      invoiceNumber = `INV-${String(lastNum + 1).padStart(3, "0")}`;
    }
    const invoiceId = Date.now().toString();
    db2.prepare(`
      INSERT INTO invoices (id, invoice_number, client_name, client_email, amount, status, issue_date, due_date, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(invoiceId, invoiceNumber, client_name, client_email, amount, "draft", issue_date, due_date);
    if (items && Array.isArray(items)) {
      const insertItem = db2.prepare(`
        INSERT INTO invoice_items (id, invoice_id, description, quantity, unit_price, total, created_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `);
      for (const item of items) {
        const itemId = `${invoiceId}-${Date.now()}-${Math.random()}`;
        const total = item.quantity * item.unit_price;
        insertItem.run(itemId, invoiceId, item.description, item.quantity, item.unit_price, total);
      }
    }
    const invoice = db2.prepare("SELECT * FROM invoices WHERE id = ?").get(invoiceId);
    res.json({
      success: true,
      data: invoice
    });
  } catch (error) {
    console.error("Error creating invoice:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create invoice"
    });
  }
});
router3.post("/:id/send", async (req, res) => {
  try {
    const { id } = req.params;
    const db2 = getDatabase();
    const invoice = db2.prepare("SELECT * FROM invoices WHERE id = ?").get(id);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: "Invoice not found"
      });
    }
    const emailSent = await sendEmail({
      to: invoice.client_email,
      subject: `Invoice ${invoice.invoice_number} from TichPay`,
      html: `
        <h2>Invoice ${invoice.invoice_number}</h2>
        <p>Dear ${invoice.client_name},</p>
        <p>Please find your invoice details below:</p>
        <ul>
          <li><strong>Invoice Number:</strong> ${invoice.invoice_number}</li>
          <li><strong>Amount:</strong> $${(invoice.amount / 100).toFixed(2)}</li>
          <li><strong>Issue Date:</strong> ${invoice.issue_date}</li>
          <li><strong>Due Date:</strong> ${invoice.due_date}</li>
        </ul>
        <p>Thank you for your business!</p>
        <p>Best regards,<br>TichPay Team</p>
      `
    });
    if (emailSent) {
      db2.prepare(`
        UPDATE invoices 
        SET status = 'sent', updated_at = datetime('now')
        WHERE id = ?
      `).run(id);
      res.json({
        success: true,
        message: "Invoice sent successfully"
      });
    } else {
      res.status(500).json({
        success: false,
        error: "Failed to send email"
      });
    }
  } catch (error) {
    console.error("Error sending invoice:", error);
    res.status(500).json({
      success: false,
      error: "Failed to send invoice"
    });
  }
});
router3.patch("/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!["draft", "sent", "paid", "overdue"].includes(status)) {
      return res.status(400).json({
        success: false,
        error: "Invalid status"
      });
    }
    const db2 = getDatabase();
    db2.prepare(`
      UPDATE invoices 
      SET status = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(status, id);
    res.json({
      success: true,
      message: "Invoice status updated"
    });
  } catch (error) {
    console.error("Error updating invoice status:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update invoice status"
    });
  }
});
var invoices_default = router3;

// server/routes/stats.ts
import { Router as Router3 } from "express";
var router4 = Router3();
router4.get("/dashboard", async (req, res) => {
  try {
    const db2 = getDatabase();
    const revenueResult = db2.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total_revenue
      FROM transactions
      WHERE status = 'completed'
    `).get();
    const clicksResult = db2.prepare(`
      SELECT COALESCE(COUNT(*), 0) as total_clicks
      FROM payment_link_clicks
    `).get();
    const linksResult = db2.prepare(`
      SELECT 
        COUNT(*) as total_links,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_links
      FROM payment_links
    `).get();
    const conversionResult = db2.prepare(`
      SELECT 
        COUNT(DISTINCT pl.id) as links_with_clicks,
        COUNT(DISTINCT t.payment_link_id) as links_with_payments
      FROM payment_links pl
      LEFT JOIN payment_link_clicks plc ON pl.id = plc.payment_link_id
      LEFT JOIN transactions t ON pl.id = t.payment_link_id AND t.status = 'completed'
    `).get();
    const conversionRate = conversionResult.links_with_clicks > 0 ? conversionResult.links_with_payments / conversionResult.links_with_clicks * 100 : 0;
    const recentTransactions = db2.prepare(`
      SELECT 
        t.id,
        t.amount,
        t.currency,
        t.status,
        t.created_at,
        pl.title as payment_link_title
      FROM transactions t
      LEFT JOIN payment_links pl ON t.payment_link_id = pl.id
      ORDER BY t.created_at DESC
      LIMIT 10
    `).all();
    const paymentLinks = db2.prepare(`
      SELECT 
        pl.id,
        pl.title,
        pl.amount,
        pl.currency,
        pl.status,
        pl.stripe_payment_link_id,
        pl.created_at,
        COUNT(DISTINCT plc.id) as clicks,
        COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) as payments,
        COALESCE(SUM(CASE WHEN t.status = 'completed' THEN t.amount ELSE 0 END), 0) as total_earned
      FROM payment_links pl
      LEFT JOIN payment_link_clicks plc ON pl.id = plc.payment_link_id
      LEFT JOIN transactions t ON pl.id = t.payment_link_id
      GROUP BY pl.id
      ORDER BY pl.created_at DESC
      LIMIT 20
    `).all();
    res.json({
      success: true,
      data: {
        stats: {
          totalRevenue: revenueResult.total_revenue / 100,
          // Convert cents to dollars
          totalClicks: clicksResult.total_clicks,
          totalLinks: linksResult.total_links,
          activeLinks: linksResult.active_links,
          conversionRate: Math.round(conversionRate * 10) / 10
        },
        recentTransactions,
        paymentLinks
      }
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch dashboard statistics"
    });
  }
});
router4.get("/analytics", async (req, res) => {
  try {
    const db2 = getDatabase();
    const revenueOverTime = db2.prepare(`
      SELECT 
        DATE(created_at) as date,
        SUM(amount) as revenue,
        COUNT(*) as transactions
      FROM transactions
      WHERE status = 'completed'
        AND created_at >= datetime('now', '-30 days')
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `).all();
    const clicksOverTime = db2.prepare(`
      SELECT 
        DATE(clicked_at) as date,
        COUNT(*) as clicks
      FROM payment_link_clicks
      WHERE clicked_at >= datetime('now', '-30 days')
      GROUP BY DATE(clicked_at)
      ORDER BY date ASC
    `).all();
    const topLinks = db2.prepare(`
      SELECT 
        pl.id,
        pl.title,
        pl.amount,
        COUNT(DISTINCT plc.id) as clicks,
        COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) as payments,
        COALESCE(SUM(CASE WHEN t.status = 'completed' THEN t.amount ELSE 0 END), 0) as total_earned
      FROM payment_links pl
      LEFT JOIN payment_link_clicks plc ON pl.id = plc.payment_link_id
      LEFT JOIN transactions t ON pl.id = t.payment_link_id
      GROUP BY pl.id
      ORDER BY total_earned DESC
      LIMIT 10
    `).all();
    res.json({
      success: true,
      data: {
        revenueOverTime,
        clicksOverTime,
        topLinks
      }
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch analytics data"
    });
  }
});
var stats_default = router4;

// server/index.ts
var __filename2 = fileURLToPath2(import.meta.url);
var __dirname2 = path5.dirname(__filename2);
var app = express2();
var PORT = env.PORT;
app.use(cors());
app.use(express2.json());
app.use(express2.urlencoded({ extended: true }));
app.use(
  "/api/payments/webhook",
  express2.raw({ type: "application/json" })
);
app.use((req, res, next) => {
  console.log(`${(/* @__PURE__ */ new Date()).toISOString()} - ${req.method} ${req.path}`);
  next();
});
app.use("/api/payments", payments_default);
app.use("/api/pdf", pdf_default);
app.use("/api/invoices", invoices_default);
app.use("/api/stats", stats_default);
app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    environment: env.NODE_ENV,
    features: {
      stripe: !!env.STRIPE_SECRET_KEY,
      resend: !!env.RESEND_API_KEY,
      database: true
    }
  });
});
app.use(express2.static(path5.join(__dirname2, "public")));
app.get("*", (req, res) => {
  res.sendFile(path5.join(__dirname2, "public", "index.html"));
});
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).json({
    success: false,
    error: err.message || "Internal server error"
  });
});
async function startServer() {
  try {
    console.log("");
    console.log("\u{1F680} Starting TichPay Server...");
    console.log("\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501");
    console.log("\u{1F4CA} Initializing database...");
    initializeDatabase();
    app.listen(PORT, () => {
      console.log("");
      console.log("\u{1F680} TichPay Server Started!");
      console.log("\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501");
      console.log(`\u{1F4CD} Server:        http://localhost:${PORT}`);
      console.log(`\u{1F310} Environment:   ${env.NODE_ENV}`);
      console.log(`\u{1F4B3} Stripe:        ${env.STRIPE_SECRET_KEY ? "\u2705 Configured" : "\u274C Not configured"}`);
      console.log(`\u{1F4E7} Resend:        ${env.RESEND_API_KEY ? "\u2705 Configured" : "\u274C Not configured"}`);
      console.log(`\u{1F5C4}\uFE0F  Database:      \u2705 SQLite (ready)`);
      console.log("\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501");
      console.log("");
      console.log("\u{1F4A1} Features:");
      console.log("   \u2022 Real Stripe payments");
      console.log("   \u2022 PDF generation (invoices & tax reports)");
      console.log("   \u2022 Email notifications (Resend)");
      console.log("   \u2022 SQLite database (easily switchable to MySQL/TiDB)");
      console.log("");
      console.log("\u{1F3AF} Ready for production deployment!");
      console.log("");
    });
  } catch (error) {
    console.error("\u274C Failed to start server:", error);
    process.exit(1);
  }
}
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully...");
  process.exit(0);
});
process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down gracefully...");
  process.exit(0);
});
startServer();
var index_default = app;
export {
  index_default as default
};
