# Deployment Checklist - hub.amgrealty.in & hr.amgrealty.in

## ✅ Pre-Deployment Verification

### Code Status
- [x] `server/config.js` - Already has `productionDomain: 'https://hub.amgrealty.in'`
- [x] `server/index.js` - Already includes both domains in CORS
- [x] `utils/ipAddress.ts` - Already uses `hub.amgrealty.in`
- [x] `src/utils/ipAddress.ts` - Already configured for production
- [x] `hr-admin-portal/src/utils/ipAddress.ts` - Already uses `hub.amgrealty.in`

**Result:** ✅ All code files are already correctly configured! No code changes needed.

---

## 📋 Deployment Steps

### Step 1: Build Applications

#### Main Application:
```bash
# Windows
npm run build:win

# Linux/Mac
npm run build:prod
```
Output: `dist/` folder

#### HR Admin Portal:
```bash
cd hr-admin-portal

# Windows
set VITE_BACKEND_URL=https://hub.amgrealty.in && npm run build

# Linux/Mac
VITE_BACKEND_URL=https://hub.amgrealty.in npm run build
```
Output: `hr-admin-portal/dist/` folder

- [ ] Main app built successfully
- [ ] HR portal built successfully

---

### Step 2: Upload to VPS

Upload to your Hostinger VPS:
- [ ] Upload `dist/` folder contents → `/path/to/MERN-STACK-FMS/dist/`
- [ ] Upload `hr-admin-portal/dist/` folder contents → `/path/to/MERN-STACK-FMS/hr-admin-portal/dist/`
- [ ] Ensure `server/` folder is on VPS

---

### Step 3: Configure Backend Server

On VPS:
```bash
cd /path/to/MERN-STACK-FMS/server
```

- [ ] Create/update `server/.env` file with:
  ```env
  NODE_ENV=production
  MONGO_URI=your_mongodb_connection_string
  JWT_SECRET=your_secure_jwt_secret
  BACKEND_PORT=3000
  CORS_ORIGIN=https://hub.amgrealty.in
  ```

- [ ] Install dependencies: `npm install`
- [ ] Start server with PM2 or systemd

---

### Step 4: Configure Nginx

- [ ] Create `/etc/nginx/sites-available/hub.amgrealty.in`
- [ ] Create `/etc/nginx/sites-available/hr.amgrealty.in`
- [ ] Enable both sites:
  ```bash
  sudo ln -s /etc/nginx/sites-available/hub.amgrealty.in /etc/nginx/sites-enabled/
  sudo ln -s /etc/nginx/sites-available/hr.amgrealty.in /etc/nginx/sites-enabled/
  ```
- [ ] Test config: `sudo nginx -t`
- [ ] Reload Nginx: `sudo systemctl reload nginx`

---

### Step 5: SSL Certificates

- [ ] Install Certbot: `sudo apt install certbot python3-certbot-nginx`
- [ ] Get certificate for hub: `sudo certbot --nginx -d hub.amgrealty.in`
- [ ] Get certificate for hr: `sudo certbot --nginx -d hr.amgrealty.in`
- [ ] Test auto-renewal: `sudo certbot renew --dry-run`

---

### Step 6: DNS Configuration

- [ ] DNS A record for `hub.amgrealty.in` → VPS IP
- [ ] DNS A record for `hr.amgrealty.in` → VPS IP
- [ ] Wait for DNS propagation (can take up to 24 hours)

---

### Step 7: Verification

- [ ] Test backend: `curl https://hub.amgrealty.in/health`
- [ ] Visit main app: `https://hub.amgrealty.in`
- [ ] Visit HR portal: `https://hr.amgrealty.in`
- [ ] Check browser console for errors
- [ ] Test login on both applications
- [ ] Verify API calls in Network tab

---

## 🔧 Quick Commands Reference

### Backend Server
```bash
# PM2
pm2 start index.js --name "fms-backend"
pm2 restart fms-backend
pm2 logs fms-backend

# Systemd
sudo systemctl start fms-backend
sudo systemctl restart fms-backend
sudo systemctl status fms-backend
```

### Nginx
```bash
sudo nginx -t
sudo systemctl reload nginx
sudo systemctl status nginx
sudo tail -f /var/log/nginx/error.log
```

### Health Checks
```bash
curl http://localhost:3000/health
curl https://hub.amgrealty.in/health
```

---

## 📝 Notes

- **No code changes needed** - all files are already configured correctly
- Main work is: building, uploading, configuring Nginx, and setting up SSL
- Backend URL `hub.amgrealty.in` is already set in all frontend files
- CORS is already configured for both domains in `server/index.js`

---

## 🆘 Troubleshooting

If something doesn't work:
1. Check server logs: `pm2 logs` or `sudo journalctl -u fms-backend -f`
2. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. Verify backend is running: `curl http://localhost:3000/health`
4. Check browser console and Network tab for errors

---

**Ready to deploy!** 🚀

