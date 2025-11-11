
# 🚀 Hostinger VPS Deployment Guide

## Prerequisites

- Hostinger VPS account with root access
- Domain name pointed to your VPS IP
- SSH access to your VPS
- Basic knowledge of Linux commands

## 📋 Table of Contents

1. [Initial VPS Setup](#initial-vps-setup)
2. [Install Required Software](#install-required-software)
3. [Setup MongoDB](#setup-mongodb)
4. [Setup Node.js & PM2](#setup-nodejs--pm2)
5. [Deploy Application](#deploy-application)
6. [Configure Nginx](#configure-nginx)
7. [SSL Certificate Setup](#ssl-certificate-setup)
8. [Environment Variables](#environment-variables)
9. [Maintenance & Monitoring](#maintenance--monitoring)

---

## 1. Initial VPS Setup

### Connect to VPS via SSH

```bash
ssh root@your-vps-ip
```

### Update System

```bash
apt update && apt upgrade -y
```

### Create Deploy User (Security Best Practice)

```bash
adduser deploy
usermod -aG sudo deploy
su - deploy
```

---

## 2. Install Required Software

### Install Node.js (v20.x)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node --version
npm --version
```

### Install Git

```bash
sudo apt install -y git
```

### Install Build Tools

```bash
sudo apt install -y build-essential
```

---

## 3. Setup MongoDB

### Import MongoDB GPG Key

```bash
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
   sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg \
   --dearmor
```

### Add MongoDB Repository

```bash
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
```

### Install MongoDB

```bash
sudo apt update
sudo apt install -y mongodb-org
```

### Start MongoDB Service

```bash
sudo systemctl start mongod
sudo systemctl enable mongod
sudo systemctl status mongod
```

### Secure MongoDB (IMPORTANT!)

```bash
mongosh
```

Inside MongoDB shell:

```javascript
use admin
db.createUser({
  user: "admin",
  pwd: "YOUR_STRONG_PASSWORD_HERE",
  roles: [ { role: "userAdminAnyDatabase", db: "admin" }, "readWriteAnyDatabase" ]
})
exit
```

Edit MongoDB config to enable authentication:

```bash
sudo nano /etc/mongod.conf
```

Add/modify these lines:

```yaml
security:
  authorization: enabled

net:
  bindIp: 127.0.0.1
```

Restart MongoDB:

```bash
sudo systemctl restart mongod
```

---

## 4. Setup Node.js & PM2

### Install PM2 Globally

```bash
sudo npm install -g pm2
```

### Configure PM2 Startup

```bash
pm2 startup
# Follow the command output instructions
```

---

## 5. Deploy Application

### Create Application Directory

```bash
sudo mkdir -p /var/www/task-management
sudo chown -R deploy:deploy /var/www/task-management
cd /var/www/task-management
```

### Clone Repository (or Upload Files)

**Option A: Using Git**

```bash
git clone https://github.com/your-username/your-repo.git .
```

**Option B: Using SCP from Local Machine**

```bash
# Run this from your local machine
scp -r /path/to/project/* deploy@your-vps-ip:/var/www/task-management/
```

### Install Dependencies

```bash
cd /var/www/task-management
npm install
```

### Build Frontend

```bash
npm run build
```

### Create Environment File

```bash
nano .env
```

Add the following:

```env
MONGO_URI=mongodb://admin:YOUR_STRONG_PASSWORD_HERE@localhost:27017/task-management-system?authSource=admin
BACKEND_PORT=3000
NODE_ENV=production
JWT_SECRET=your-super-secret-production-jwt-key-CHANGE-THIS
CORS_ORIGIN=https://yourdomain.com
```

**⚠️ IMPORTANT**: Change all password and secret values!

### Create PM2 Ecosystem File

```bash
nano ecosystem.config.js
```

Add:

```javascript
module.exports = {
  apps: [{
    name: 'task-management',
    script: './server/index.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      BACKEND_PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

### Create Logs Directory

```bash
mkdir -p logs
```

### Start Application with PM2

```bash
pm2 start ecosystem.config.js
pm2 save
```

### Verify Application is Running

```bash
pm2 status
pm2 logs task-management
```

---

## 6. Configure Nginx

### Install Nginx

```bash
sudo apt install -y nginx
```

### Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/task-management
```

Add:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Redirect to HTTPS (will be configured later)
    # return 301 https://$server_name$request_uri;

    # API Proxy
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # File Uploads
    location /uploads/ {
        proxy_pass http://localhost:3000;
        client_max_body_size 10M;
    }

    # Assets
    location /assets/ {
        proxy_pass http://localhost:3000;
    }

    # Frontend (Serve static files from dist)
    location / {
        root /var/www/task-management/dist;
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache";
    }

    # Enable gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;
}
```

### Enable Site

```bash
sudo ln -s /etc/nginx/sites-available/task-management /etc/nginx/sites-enabled/
```

### Test Nginx Configuration

```bash
sudo nginx -t
```

### Restart Nginx

```bash
sudo systemctl restart nginx
sudo systemctl enable nginx
```

---

## 7. SSL Certificate Setup (Let's Encrypt)

### Install Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### Obtain SSL Certificate

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Follow the prompts. Certbot will automatically configure Nginx for HTTPS.

### Auto-Renewal Test

```bash
sudo certbot renew --dry-run
```

### Update Nginx Config for HTTPS

After SSL setup, your Nginx config will be automatically updated. Verify:

```bash
sudo nano /etc/nginx/sites-available/task-management
```

It should now have both HTTP (redirect) and HTTPS sections.

---

## 8. Environment Variables

### Update CORS Origin in .env

```bash
nano /var/www/task-management/.env
```

Update:

```env
CORS_ORIGIN=https://yourdomain.com
```

### Restart Application

```bash
pm2 restart task-management
```

---

## 9. Maintenance & Monitoring

### View Application Logs

```bash
pm2 logs task-management
pm2 logs task-management --lines 100
```

### Monitor Application

```bash
pm2 monit
```

### Restart Application

```bash
pm2 restart task-management
```

### Stop Application

```bash
pm2 stop task-management
```

### View PM2 Status

```bash
pm2 status
```

### Update Application

```bash
cd /var/www/task-management
git pull origin main  # or your branch
npm install
npm run build
pm2 restart task-management
```

### MongoDB Backup

Create backup script:

```bash
nano ~/backup-mongodb.sh
```

Add:

```bash
#!/bin/bash
BACKUP_DIR="/home/deploy/mongodb-backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
mkdir -p $BACKUP_DIR
mongodump --uri="mongodb://admin:YOUR_PASSWORD@localhost:27017/task-management-system?authSource=admin" --out="$BACKUP_DIR/backup_$TIMESTAMP"
# Keep only last 7 days of backups
find $BACKUP_DIR -type d -mtime +7 -exec rm -rf {} +
```

Make executable:

```bash
chmod +x ~/backup-mongodb.sh
```

Setup daily cron job:

```bash
crontab -e
```

Add:

```
0 2 * * * /home/deploy/backup-mongodb.sh
```

### System Monitoring

**Check Disk Space:**

```bash
df -h
```

**Check Memory:**

```bash
free -h
```

**Check CPU:**

```bash
top
```

**Check Nginx Logs:**

```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

---

## 🔥 Firewall Configuration

### Setup UFW (Uncomplicated Firewall)

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

---

## 🎯 Post-Deployment Checklist

- [ ] MongoDB is running and secured
- [ ] Application starts with PM2
- [ ] Nginx is serving the application
- [ ] SSL certificate is installed
- [ ] Environment variables are set correctly
- [ ] Firewall is configured
- [ ] Backup script is scheduled
- [ ] Admin user can login at https://yourdomain.com
- [ ] All features work correctly

---

## 🐛 Troubleshooting

### Application Not Starting

```bash
pm2 logs task-management --err
```

### Cannot Connect to MongoDB

```bash
sudo systemctl status mongod
mongosh --host localhost --port 27017
```

### Nginx 502 Bad Gateway

```bash
# Check if backend is running
pm2 status
curl http://localhost:3000/health

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log
```

### Permission Issues

```bash
sudo chown -R deploy:deploy /var/www/task-management
sudo chmod -R 755 /var/www/task-management
sudo chmod -R 777 /var/www/task-management/uploads
```

---

## 📞 Support

For issues specific to this deployment, check:
- Application logs: `pm2 logs task-management`
- Nginx logs: `/var/log/nginx/error.log`
- MongoDB logs: `/var/log/mongodb/mongod.log`

---

**Your application should now be live at https://yourdomain.com! 🎉**
