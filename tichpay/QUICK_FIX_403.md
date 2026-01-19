# 🚨 Solution Rapide pour 403 Forbidden

## Commandes à exécuter sur votre VPS

Connectez-vous à votre VPS via SSH et exécutez ces commandes **dans l'ordre**:

---

## 1️⃣ Vérifier où sont les fichiers

```bash
ls -la /var/www/tichpay/
# OU
ls -la /home/ubuntu/dist/
# OU
ls -la /root/dist/
```

**Notez le chemin** où se trouvent vos fichiers.

---

## 2️⃣ Corriger les permissions

Remplacez `/var/www/tichpay` par le chemin réel:

```bash
# Donner les bonnes permissions
sudo chown -R www-data:www-data /var/www/tichpay
sudo chmod -R 755 /var/www/tichpay

# Vérifier
ls -la /var/www/tichpay/
```

Vous devriez voir `www-data www-data` comme propriétaire.

---

## 3️⃣ Vérifier la configuration Nginx

```bash
# Voir la configuration actuelle
sudo cat /etc/nginx/sites-enabled/default
# OU
sudo cat /etc/nginx/sites-enabled/tichpay
```

**Vérifiez ces lignes:**
- `root /var/www/tichpay/public;` (doit pointer vers le bon dossier)
- `index index.html;` (doit être présent)

---

## 4️⃣ Corriger la configuration Nginx

```bash
# Éditer la configuration
sudo nano /etc/nginx/sites-enabled/default
```

**Assurez-vous que ces lignes sont présentes:**

```nginx
server {
    listen 80;
    server_name tichpay.app www.tichpay.app;
    
    root /var/www/tichpay/public;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

**Sauvegarder:** `Ctrl+X`, puis `Y`, puis `Enter`

---

## 5️⃣ Tester et recharger Nginx

```bash
# Tester la configuration
sudo nginx -t

# Si OK, recharger
sudo systemctl reload nginx

# Vérifier le statut
sudo systemctl status nginx
```

---

## 6️⃣ Vérifier les logs

```bash
# Voir les erreurs
sudo tail -20 /var/log/nginx/error.log

# Voir les accès
sudo tail -20 /var/log/nginx/access.log
```

---

## 7️⃣ Tester le site

```bash
# Tester en local
curl -I http://localhost/

# Devrait retourner: HTTP/1.1 200 OK
```

Puis ouvrez votre navigateur: **http://tichpay.app**

---

## ❓ Si ça ne marche toujours pas

### Vérifier que index.html existe:

```bash
ls -la /var/www/tichpay/public/index.html
```

### Vérifier les permissions du dossier parent:

```bash
namei -l /var/www/tichpay/public/index.html
```

Tous les dossiers doivent avoir au minimum `r-x` pour "others".

### Redémarrer Nginx complètement:

```bash
sudo systemctl restart nginx
```

---

## 🆘 Erreurs courantes

### "Permission denied"
```bash
sudo chmod 755 /var/www
sudo chmod 755 /var/www/tichpay
sudo chmod 755 /var/www/tichpay/public
sudo chmod 644 /var/www/tichpay/public/index.html
```

### "No such file or directory"
Le chemin dans la config Nginx est incorrect. Vérifiez:
```bash
sudo nano /etc/nginx/sites-enabled/default
```
Et changez `root` pour pointer vers le bon dossier.

### "Connection refused" sur /api/
Le backend Node.js ne tourne pas:
```bash
cd /var/www/tichpay
pm2 start index.js --name tichpay
```

---

## ✅ Checklist Rapide

- [ ] Fichiers dans `/var/www/tichpay/public/`
- [ ] Permissions: `sudo chown -R www-data:www-data /var/www/tichpay`
- [ ] Permissions: `sudo chmod -R 755 /var/www/tichpay`
- [ ] Nginx config: `root /var/www/tichpay/public;`
- [ ] Nginx config: `index index.html;`
- [ ] Test Nginx: `sudo nginx -t`
- [ ] Reload Nginx: `sudo systemctl reload nginx`
- [ ] Backend running: `pm2 status`
- [ ] Test: `curl -I http://localhost/`
- [ ] Browser: http://tichpay.app

---

**Si vous suivez ces étapes, le 403 sera résolu! 🎉**
