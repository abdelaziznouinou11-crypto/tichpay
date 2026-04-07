# 🚀 Guide de Déploiement TichPay sur Railway.app

Ce guide vous explique comment mettre TichPay en ligne en moins de 5 minutes sur Railway.

## 📋 Prérequis
1. Un compte [Railway.app](https://railway.app) (Connectez-vous avec GitHub).
2. Un compte [GitHub](https://github.com).

## 🛠️ Étapes de Déploiement

### 1. Créer un nouveau dépôt sur GitHub
- Allez sur [github.com/new](https://github.com/new).
- Nommez le dépôt `tichpay`.
- Laissez-le en **Public**.
- Ne cochez aucune option (pas de README, pas de .gitignore).
- Cliquez sur **Create repository**.

### 2. Envoyer le code sur GitHub
- Décompressez le fichier `TICHPAY_RAILWAY_READY.zip`.
- Dans le dossier décompressé, ouvrez un terminal et tapez :
  ```bash
  git init
  git add .
  git commit -m "Initial commit for Railway"
  git branch -M main
  git remote add origin https://github.com/VOTRE_UTILISATEUR/tichpay.git
  git push -u origin main
  ```
  *(Remplacez VOTRE_UTILISATEUR par votre nom d'utilisateur GitHub)*

### 3. Déployer sur Railway
- Allez sur votre [Dashboard Railway](https://railway.app/dashboard).
- Cliquez sur **+ New Project**.
- Choisissez **Deploy from GitHub repo**.
- Sélectionnez votre dépôt `tichpay`.
- Cliquez sur **Deploy Now**.

### 4. Configurer les Variables d'Environnement (CRUCIAL)
Une fois le projet créé sur Railway, allez dans l'onglet **Variables** et ajoutez les suivantes :
- `STRIPE_SECRET_KEY` : Votre clé secrète Stripe (sk_test_...).
- `STRIPE_WEBHOOK_SECRET` : Votre secret de webhook Stripe (whsec_...).
- `RESEND_API_KEY` : Votre clé API Resend (re_...).
- `JWT_SECRET` : Une phrase secrète aléatoire pour sécuriser les sessions.
- `DATABASE_URL` : `./data/tichpay.db`

## 🌐 Lier votre domaine tichpay.com
1. Dans Railway, allez dans l'onglet **Settings**.
2. Cherchez la section **Domains**.
3. Cliquez sur **Custom Domain**.
4. Entrez `tichpay.com`.
5. Railway vous donnera des enregistrements DNS (CNAME ou A) à ajouter chez votre fournisseur de domaine (Hostinger/GoDaddy).

## ✅ C'est terminé !
Votre site sera accessible sur `tichpay.com` avec SSL (HTTPS) activé automatiquement.

---
*Note : Si vous avez des questions, n'hésitez pas à me demander !*
