# 🚀 TichPay - Guide de Déploiement VPS Complet

## Résolution du problème 403 Forbidden

---

## 📋 Prérequis

Vous devez avoir accès SSH à votre VPS avec:
- Ubuntu 20.04+ ou Debian
- Accès root ou sudo
- Domaine pointant vers le VPS (tichpay.app)

---

## 🔧 Étape 1: Installation de Nginx

Connectez-vous à votre VPS via SSH et exécutez:

```bash
# Mettre à jour les paquets
sudo apt update

# Installer Nginx
sudo apt install nginx -y

# Démarrer Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Vérifier que Nginx fonctionne
sudo systemctl status nginx
```

---

## 📁 Étape 2: Uploader les fichiers

### Option A: Via SCP (depuis votre ordinateur)

```bash
# Uploader le package
scp TICHPAY_PRODUCTION_READY.zip root@your-vps-ip:/root/

# Se connecter au VPS
ssh root@your-vps-ip

# Extraire
cd /root
unzip TICHPAY_PRODUCTION_READY.zip

# Déplacer vers /var/www
sudo mkdir -p /var/www/tichpay
sudo mv dist/* /var/www/tichpay/
```

### Option B: Via File Manager (Hostinger/cPanel)

1. Uploadez `TICHPAY_PRODUCTION_READY.zip`
2. Extrayez dans `/var/www/tichpay/`

---

## 🔑 Étape 3: Corriger les permissions

```bash
# Donner les bonnes permissions
sudo chown -R www-data:www-data /var/www/tichpay
sudo chmod -R 755 /var/www/tichpay

# Vérifier
ls -la /var/www/tichpay/
```

Vous devriez voir:
```
drwxr-xr-x  www-data www-data  public/
-rwxr-xr-x  www-data www-data  index.js
```

---

## ⚙️ Étape 4: Configuration Nginx

### Créer le fichier de configuration:

```bash
sudo nano /etc/nginx/sites-available/tichpay
```

### Coller cette configuration:

```nginx
server {
    listen 80;
    listen [::]:80;
    
    server_name tichpay.app www.tichpay.app;
    
    # Root directory for static files
    root /var/www/tichpay/public;
    index index.html;
    
    # Logging
    access_log /var/log/nginx/tichpay-access.log;
    error_log /var/log/nginx/tichpay-error.log;
    
    # Serve static files
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "public, max-age=3600";
    }
    
    # API proxy to Node.js backend
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Assets with longer cache
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json application/javascript;
}
```

### Sauvegarder: `Ctrl+X`, puis `Y`, puis `Enter`

---

## 🔗 Étape 5: Activer la configuration

```bash
# Créer le lien symbolique
sudo ln -s /etc/nginx/sites-available/tichpay /etc/nginx/sites-enabled/

# Supprimer la config par défaut
sudo rm /etc/nginx/sites-enabled/default

# Tester la configuration
sudo nginx -t
```

Vous devriez voir:
```
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### Recharger Nginx:

```bash
sudo systemctl reload nginx
```

---

## 🚀 Étape 6: Démarrer le backend Node.js

### Installer Node.js (si pas déjà installé):

```bash
# Installer Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Vérifier
node --version
npm --version
```

### Installer PM2 (gestionnaire de processus):

```bash
sudo npm install -g pm2
```

### Démarrer l'application:

```bash
cd /var/www/tichpay

# Copier le fichier .env
cp /root/dist/.env /var/www/tichpay/.env

# Démarrer avec PM2
pm2 start index.js --name tichpay

# Sauvegarder la configuration PM2
pm2 save

# Configurer le démarrage automatique
pm2 startup
# Suivez les instructions affichées
```

### Vérifier que le backend fonctionne:

```bash
pm2 status
pm2 logs tichpay
```

---

## 🧪 Étape 7: Tester

### Tester le backend:

```bash
curl http://localhost:3000/api/health
```

Vous devriez voir:
```json
{
  "status": "healthy",
  "timestamp": "...",
  "services": {
    "stripe": "configured",
    "resend": "configured",
    "database": "connected"
  }
}
```

### Tester le frontend:

```bash
curl http://localhost/
```

Vous devriez voir du HTML.

### Tester depuis l'extérieur:

Ouvrez votre navigateur et allez sur:
```
http://tichpay.app
```

Vous devriez voir la page d'accueil de TichPay! 🎉

---

## 🔒 Étape 8: Ajouter SSL (HTTPS)

### Installer Certbot:

```bash
sudo apt install certbot python3-certbot-nginx -y
```

### Obtenir un certificat SSL gratuit:

```bash
sudo certbot --nginx -d tichpay.app -d www.tichpay.app
```

Suivez les instructions:
1. Entrez votre email
2. Acceptez les termes
3. Choisissez "2" pour rediriger HTTP vers HTTPS

### Renouvellement automatique:

```bash
sudo certbot renew --dry-run
```

Maintenant votre site est accessible en HTTPS:
```
https://tichpay.app
```

---

## 📊 Étape 9: Monitoring

### Vérifier les logs Nginx:

```bash
# Logs d'accès
sudo tail -f /var/log/nginx/tichpay-access.log

# Logs d'erreur
sudo tail -f /var/log/nginx/tichpay-error.log
```

### Vérifier les logs de l'application:

```bash
pm2 logs tichpay
```

### Vérifier le statut:

```bash
# Nginx
sudo systemctl status nginx

# Application
pm2 status

# Base de données
ls -lh /var/www/tichpay/data/tichpay.db
```

---

## 🐛 Dépannage

### Problème: 403 Forbidden

**Cause:** Mauvaises permissions

**Solution:**
```bash
sudo chown -R www-data:www-data /var/www/tichpay
sudo chmod -R 755 /var/www/tichpay
sudo systemctl reload nginx
```

### Problème: 502 Bad Gateway

**Cause:** Backend Node.js ne fonctionne pas

**Solution:**
```bash
cd /var/www/tichpay
pm2 restart tichpay
pm2 logs tichpay
```

### Problème: API ne fonctionne pas

**Cause:** Variables d'environnement manquantes

**Solution:**
```bash
cd /var/www/tichpay
cat .env  # Vérifier que les clés API sont présentes
pm2 restart tichpay
```

### Problème: Base de données verrouillée

**Cause:** Permissions sur le fichier SQLite

**Solution:**
```bash
sudo chown www-data:www-data /var/www/tichpay/data/tichpay.db*
sudo chmod 664 /var/www/tichpay/data/tichpay.db*
```

---

## ✅ Checklist de Déploiement

- [ ] Nginx installé et démarré
- [ ] Fichiers uploadés dans `/var/www/tichpay/`
- [ ] Permissions correctes (www-data:www-data, 755)
- [ ] Configuration Nginx créée et activée
- [ ] Node.js installé
- [ ] PM2 installé
- [ ] Backend démarré avec PM2
- [ ] Variables d'environnement (.env) copiées
- [ ] Test backend: `curl http://localhost:3000/api/health`
- [ ] Test frontend: `curl http://localhost/`
- [ ] Site accessible sur http://tichpay.app
- [ ] SSL installé avec Certbot
- [ ] Site accessible sur https://tichpay.app
- [ ] Logs vérifiés (pas d'erreurs)

---

## 🎉 Félicitations!

Votre site TichPay est maintenant en ligne et opérationnel!

**URL:** https://tichpay.app

**Fonctionnalités actives:**
- ✅ Création de payment links Stripe
- ✅ Paiements réels
- ✅ Génération de factures
- ✅ Envoi d'emails
- ✅ Dashboard analytics
- ✅ Base de données persistante

---

## 📞 Support

Si vous rencontrez des problèmes:

1. Vérifiez les logs: `sudo tail -f /var/log/nginx/tichpay-error.log`
2. Vérifiez PM2: `pm2 logs tichpay`
3. Vérifiez les permissions: `ls -la /var/www/tichpay/`
4. Testez le backend: `curl http://localhost:3000/api/health`

---

**Guide créé le:** 13 janvier 2026  
**Version:** 1.0  
**Système testé:** Ubuntu 20.04+
