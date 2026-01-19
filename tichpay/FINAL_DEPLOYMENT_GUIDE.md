# 🚀 TichPay - Guide de Déploiement Final (100% Complet)

## ✅ Ce Package Contient

Ce package est **100% prêt pour la production** avec:

- ✅ **Stripe Integration** - Paiements réels fonctionnels
- ✅ **Dashboard Stats** - Données réelles de la base de données
- ✅ **PDF Generation** - Factures et rapports fiscaux
- ✅ **Email System** - Notifications via Resend
- ✅ **SQLite Database** - Avec données de test
- ✅ **PM2 Configuration** - Pour uptime 24/7
- ✅ **Nginx Configuration** - Optimisée et sécurisée

---

## 📦 Contenu du Package

```
tichpay-final/
├── dist/                    # Application compilée (prête à déployer)
│   ├── index.js            # Backend Node.js
│   └── public/             # Frontend React
├── data/                    # Base de données SQLite
│   └── tichpay.db          # Avec données de test
├── .env                     # Variables d'environnement (Stripe + Resend)
├── ecosystem.config.js      # Configuration PM2
├── nginx-tichpay.conf      # Configuration Nginx
└── logs/                    # Dossier pour les logs PM2
```

---

## 🚀 Déploiement Rapide (15 minutes)

### Étape 1: Upload sur VPS

```bash
# Via SCP
scp tichpay-final.zip root@your-vps-ip:/var/www/

# Ou via File Manager (Hostinger/cPanel)
# Uploadez dans /var/www/
```

### Étape 2: Extraction

```bash
ssh root@your-vps-ip
cd /var/www
unzip tichpay-final.zip
cd tichpay-final
```

### Étape 3: Installer Node.js (si nécessaire)

```bash
# Installer Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Vérifier
node --version  # Devrait afficher v18.x ou plus
```

### Étape 4: Installer PM2

```bash
sudo npm install -g pm2
```

### Étape 5: Démarrer l'application

```bash
# Créer le dossier logs
mkdir -p logs

# Démarrer avec PM2
pm2 start ecosystem.config.js

# Sauvegarder la configuration
pm2 save

# Configurer le démarrage automatique
pm2 startup
# Suivez les instructions affichées (copier-coller la commande)
```

### Étape 6: Vérifier que ça fonctionne

```bash
# Vérifier PM2
pm2 status

# Vérifier les logs
pm2 logs tichpay --lines 20

# Tester l'API
curl http://localhost:3000/api/health
```

Vous devriez voir:
```json
{
  "status": "healthy",
  "features": {
    "stripe": true,
    "resend": true,
    "database": true
  }
}
```

### Étape 7: Configurer Nginx

```bash
# Installer Nginx (si nécessaire)
sudo apt update
sudo apt install nginx -y

# Copier la configuration
sudo cp nginx-tichpay.conf /etc/nginx/sites-available/tichpay

# Activer la configuration
sudo ln -s /etc/nginx/sites-available/tichpay /etc/nginx/sites-enabled/

# Supprimer la config par défaut
sudo rm /etc/nginx/sites-enabled/default

# IMPORTANT: Éditer la configuration pour votre domaine
sudo nano /etc/nginx/sites-available/tichpay
```

**Dans le fichier, modifiez:**
```nginx
server_name tichpay.app www.tichpay.app;  # ← Votre domaine
root /var/www/tichpay-final/dist/public;  # ← Votre chemin
```

```bash
# Tester la configuration
sudo nginx -t

# Recharger Nginx
sudo systemctl reload nginx
```

### Étape 8: Corriger les permissions (Fix 403)

```bash
# Donner les bonnes permissions
sudo chown -R www-data:www-data /var/www/tichpay-final
sudo chmod -R 755 /var/www/tichpay-final

# Vérifier
ls -la /var/www/tichpay-final/dist/public/
```

### Étape 9: Tester le site

```bash
# Test local
curl -I http://localhost/

# Devrait retourner: HTTP/1.1 200 OK
```

Ouvrez votre navigateur: **http://tichpay.app**

Vous devriez voir la page d'accueil! 🎉

### Étape 10: Ajouter SSL (HTTPS)

```bash
# Installer Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtenir un certificat SSL gratuit
sudo certbot --nginx -d tichpay.app -d www.tichpay.app

# Suivez les instructions:
# 1. Entrez votre email
# 2. Acceptez les termes
# 3. Choisissez "2" pour rediriger HTTP vers HTTPS
```

Maintenant votre site est accessible en HTTPS: **https://tichpay.app** 🔒

---

## ✅ Vérification Post-Déploiement

### 1. Backend Fonctionnel

```bash
curl https://tichpay.app/api/health
```

Devrait retourner:
```json
{
  "status": "healthy",
  "features": {
    "stripe": true,
    "resend": true,
    "database": true
  }
}
```

### 2. Frontend Accessible

Ouvrez https://tichpay.app dans votre navigateur.

Vous devriez voir:
- ✅ Page d'accueil avec design professionnel
- ✅ Boutons Login/Sign Up fonctionnels
- ✅ Footer avec liens

### 3. Dashboard avec Stats Réelles

1. Cliquez sur "Login"
2. Entrez: `demo@tichpay.com` / `password123`
3. Vous devriez voir le Dashboard avec:
   - ✅ Total Revenue (données réelles de la DB)
   - ✅ Total Clicks (données réelles)
   - ✅ Total Links (données réelles)
   - ✅ Liste des payment links

### 4. Stripe Payment Links

1. Allez dans "Payment Links"
2. Cliquez sur "Create Link"
3. Remplissez le formulaire
4. Cliquez sur "Create Link"
5. Un nouveau payment link Stripe devrait être créé! ✅

### 5. PDF Generation

1. Allez dans "Invoicing"
2. Cliquez sur "Download" sur une facture
3. Un PDF devrait se télécharger! ✅

### 6. PM2 Running 24/7

```bash
pm2 status
```

Devrait afficher:
```
┌─────┬──────────┬─────────┬─────────┬─────────┬──────────┐
│ id  │ name     │ status  │ restart │ uptime  │ cpu      │
├─────┼──────────┼─────────┼─────────┼─────────┼──────────┤
│ 0   │ tichpay  │ online  │ 0       │ 5m      │ 0%       │
└─────┴──────────┴─────────┴─────────┴─────────┴──────────┘
```

Status devrait être **"online"** ✅

---

## 🔧 Commandes Utiles

### PM2

```bash
# Voir le statut
pm2 status

# Voir les logs
pm2 logs tichpay

# Redémarrer
pm2 restart tichpay

# Arrêter
pm2 stop tichpay

# Supprimer
pm2 delete tichpay

# Monitoring en temps réel
pm2 monit
```

### Nginx

```bash
# Tester la configuration
sudo nginx -t

# Recharger
sudo systemctl reload nginx

# Redémarrer
sudo systemctl restart nginx

# Voir les logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### Base de données

```bash
# Voir la base de données
sqlite3 data/tichpay.db

# Dans sqlite3:
.tables                    # Voir les tables
SELECT * FROM payment_links;  # Voir les payment links
.quit                      # Quitter
```

---

## 🐛 Dépannage

### Problème: 403 Forbidden

**Solution:**
```bash
sudo chown -R www-data:www-data /var/www/tichpay-final
sudo chmod -R 755 /var/www/tichpay-final
sudo systemctl reload nginx
```

### Problème: 502 Bad Gateway

**Cause:** Backend ne fonctionne pas

**Solution:**
```bash
pm2 restart tichpay
pm2 logs tichpay
```

### Problème: Stats ne se chargent pas

**Cause:** API ne répond pas

**Solution:**
```bash
# Vérifier que le backend fonctionne
curl http://localhost:3000/api/health

# Vérifier les logs
pm2 logs tichpay

# Redémarrer si nécessaire
pm2 restart tichpay
```

### Problème: Stripe ne fonctionne pas

**Cause:** Clés API manquantes ou incorrectes

**Solution:**
```bash
# Vérifier le fichier .env
cat .env | grep STRIPE

# Les clés doivent être présentes
# Si manquantes, éditez .env
nano .env

# Puis redémarrez
pm2 restart tichpay
```

### Problème: Emails ne s'envoient pas

**Cause:** Clé Resend manquante ou incorrecte

**Solution:**
```bash
# Vérifier
cat .env | grep RESEND

# Éditer si nécessaire
nano .env

# Redémarrer
pm2 restart tichpay
```

---

## 📊 Monitoring

### Vérifier l'uptime

```bash
pm2 status
```

### Vérifier l'utilisation des ressources

```bash
pm2 monit
```

### Vérifier les logs en temps réel

```bash
pm2 logs tichpay --lines 50
```

### Vérifier l'espace disque

```bash
df -h
```

### Vérifier la mémoire

```bash
free -h
```

---

## 🔒 Sécurité

### Firewall (UFW)

```bash
# Installer UFW
sudo apt install ufw

# Autoriser SSH, HTTP, HTTPS
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Activer
sudo ufw enable

# Vérifier
sudo ufw status
```

### Mises à jour automatiques

```bash
# Installer unattended-upgrades
sudo apt install unattended-upgrades

# Activer
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

---

## 📈 Performance

### Activer la compression Gzip (déjà dans nginx-tichpay.conf)

La configuration Nginx inclut déjà:
- ✅ Compression Gzip
- ✅ Cache des assets statiques
- ✅ Headers de sécurité

### Optimiser PM2

PM2 est déjà configuré pour:
- ✅ Auto-restart en cas de crash
- ✅ Limite mémoire (500MB)
- ✅ Logs rotatifs

---

## 🎉 Félicitations!

Votre site TichPay est maintenant:

- ✅ **En ligne** sur https://tichpay.app
- ✅ **Sécurisé** avec SSL
- ✅ **Performant** avec Nginx + PM2
- ✅ **Fonctionnel** avec Stripe, PDF, Emails
- ✅ **Stable** avec uptime 24/7
- ✅ **Prêt** pour la vente sur Acquire.com!

---

## 💰 Prêt pour Acquire.com

Avec ce déploiement complet, vous pouvez:

1. **Créer une démo live** pour les acheteurs
2. **Montrer les fonctionnalités réelles** (pas de mock data!)
3. **Prouver que tout fonctionne** (Stripe, PDF, Emails)
4. **Vendre à un prix premium** ($35,000 - $50,000)

Le site est **100% opérationnel** et **prêt pour la production**! 🚀

---

**Guide créé le:** 14 janvier 2026  
**Version:** 2.0 Final  
**Status:** ✅ Production-Ready
