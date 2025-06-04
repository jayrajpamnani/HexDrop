# Deploying HexDrop on AWS EC2

This guide will help you deploy HexDrop on an AWS EC2 instance.

## Prerequisites

1. AWS Account
2. Basic knowledge of AWS EC2
3. SSH client installed on your local machine

## Step 1: Launch an EC2 Instance

1. Log in to AWS Console
2. Go to EC2 Dashboard
3. Click "Launch Instance"
4. Choose "Ubuntu Server 22.04 LTS"
5. Select "t2.micro" (Free tier eligible)
6. Configure Security Group:
   - Allow SSH (Port 22)
     - Type: SSH
     - Protocol: TCP
     - Port Range: 22
     - Source: Your IP address (for security) or 0.0.0.0/0 (not recommended for production)
   - Allow HTTP (Port 80)
     - Type: HTTP
     - Protocol: TCP
     - Port Range: 80
     - Source: 0.0.0.0/0 (allows traffic from anywhere)
   - Allow HTTPS (Port 443)
     - Type: HTTPS
     - Protocol: TCP
     - Port Range: 443
     - Source: 0.0.0.0/0 (allows traffic from anywhere)
   - Additional Security Tips:
     - Name your security group (e.g., "hexdrop-security-group")
     - Add a description for better management
     - Consider restricting SSH access to your IP address only
     - Review and remove any unnecessary inbound rules
7. Create or select an existing key pair:
   - Click "Create new key pair"
   - Enter a name (e.g., "hexdrop-key")
   - Choose "RSA" as the key pair type
   - Select ".pem" as the private key file format
   - Click "Create key pair"
   - The .pem file will automatically download to your computer
   - Store this file securely - you'll need it to connect to your instance
   - Set proper permissions on the key file:
     ```bash
     chmod 400 /path/to/your-key.pem
     ```
   - Never share your private key file
   - If you lose the key file, you'll need to create a new instance
8. Launch the instance

## Step 2: Connect to Your Instance

```bash
# Replace with your key file and instance IP
ssh -i /path/to/your-key.pem ubuntu@your-instance-ip
```

## Step 3: Deploy the Application

1. Make the deployment script executable:
```bash
chmod +x deploy.sh
```

2. Run the deployment script:
```bash
./deploy.sh
```

## Step 4: Configure Environment Variables

1. Create a `.env` file in the application directory:
```bash
cd /var/www/hexdrop
nano .env
```

2. Add your environment variables:
```
AWS_REGION=your-region
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=your-bucket-name
```

3. Restart the application:
```bash
pm2 restart hexdrop
```

## Step 5: Set Up SSL (Optional)

If you have a domain name:

1. Install Certbot:
```bash
sudo apt-get install -y certbot python3-certbot-nginx
```

2. Obtain SSL certificate:
```bash
sudo certbot --nginx -d yourdomain.com
```

## Monitoring and Maintenance

### View Application Logs
```bash
pm2 logs hexdrop
```

### Monitor Application Status
```bash
pm2 status
```

### Restart Application
```bash
pm2 restart hexdrop
```

### Update Application
```bash
cd /var/www/hexdrop
git pull
npm install
npm run build
pm2 restart hexdrop
```

## Troubleshooting

### Check Nginx Status
```bash
sudo systemctl status nginx
```

### Check Application Status
```bash
pm2 status
```

### View Nginx Error Logs
```bash
sudo tail -f /var/log/nginx/error.log
```

### View Application Logs
```bash
pm2 logs hexdrop
```

## Security Considerations

1. Keep your system updated:
```bash
sudo apt-get update && sudo apt-get upgrade -y
```

2. Configure firewall (UFW):
```bash
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
sudo ufw enable
```

3. Regularly update dependencies:
```bash
cd /var/www/hexdrop
npm audit fix
```

## Backup

1. Backup your application:
```bash
cd /var/www/hexdrop
tar -czf backup.tar.gz .
```

2. Backup your database (if using one):
```bash
# Add your database backup commands here
```

## Additional Resources

- [AWS EC2 Documentation](https://docs.aws.amazon.com/ec2/)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Next.js Deployment](https://nextjs.org/docs/deployment) 