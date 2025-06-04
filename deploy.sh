#!/bin/bash

# Update system packages
sudo apt-get update
sudo apt-get upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -y pm2@latest -g

# Install Nginx
sudo apt-get install -y nginx

# Install Git
sudo apt-get install -y git

# Create app directory
sudo mkdir -p /var/www/hexdrop
sudo chown -R $USER:$USER /var/www/hexdrop

# Clone repository (replace with your repository URL)
git clone https://github.com/jayrajpamnani/HexDrop.git /var/www/hexdrop

# Navigate to app directory
cd /var/www/hexdrop

# Install dependencies
npm install

# Build the application
npm run build

# Start the application with PM2 in production mode
pm2 start npm --name "hexdrop" -- run start:prod

# Save PM2 process list
pm2 save

# Setup PM2 to start on system boot
pm2 startup

# Configure Nginx
sudo tee /etc/nginx/sites-available/hexdrop << EOF
server {
    listen 80;
    server_name _;  # Replace with your domain if you have one

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Enable the site
sudo ln -s /etc/nginx/sites-available/hexdrop /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# Setup SSL with Certbot (optional)
# sudo apt-get install -y certbot python3-certbot-nginx
# sudo certbot --nginx -d yourdomain.com 