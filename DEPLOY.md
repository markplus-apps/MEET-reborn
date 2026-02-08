# MarkPlus Meet — Panduan Deploy ke VPS

## Prasyarat VPS

- **OS**: Ubuntu 22.04+ / Debian 12+
- **RAM**: Minimal 2 GB (rekomendasi 4 GB)
- **Node.js**: v20+ (LTS)
- **npm**: v10+
- **PostgreSQL**: Sudah tersedia (database VPS di 145.79.10.104)
- **Domain** (opsional): Untuk akses via domain + HTTPS

---

## Langkah 1: Siapkan VPS

### Install Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # pastikan v20+
npm -v    # pastikan v10+
```

### Install PM2 (Process Manager)

```bash
sudo npm install -g pm2
```

### Install Nginx (Reverse Proxy)

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
```

---

## Langkah 2: Clone Repository

```bash
cd /home
git clone https://github.com/USERNAME/markplus-meet.git
cd markplus-meet
```

---

## Langkah 3: Setup Environment Variables

Buat file `.env` di root project:

```bash
nano .env
```

Isi dengan:

```env
# Database
VPS_DATABASE_URL="postgresql://USER:PASSWORD@145.79.10.104:5432/markplus_meet"

# NextAuth
NEXTAUTH_SECRET="generate-random-string-min-32-chars"
NEXTAUTH_URL="https://meet.domainanda.com"

# Session
SESSION_SECRET="generate-random-string-min-32-chars"

# Email (opsional - jika tidak diisi, email tidak terkirim tapi app tetap jalan)
RESEND_API_KEY="re_xxxxx"
EMAIL_FROM="noreply@domainanda.com"

# Google Sheets Sync (opsional)
GOOGLE_SHEETS_ID="spreadsheet-id-anda"
GOOGLE_SERVICE_ACCOUNT_EMAIL="service-account@project.iam.gserviceaccount.com"
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
```

Untuk generate random string:
```bash
openssl rand -base64 32
```

---

## Langkah 4: Install Dependencies & Build

```bash
npm install
npx prisma generate
npx prisma db push
npm run build
```

---

## Langkah 5: Seed Database (Pertama Kali Saja)

```bash
npx tsx prisma/seed.mts
```

Ini akan membuat 3 user default dan 10 ruang meeting:
- Super Admin: admin@markplus.com / admin123
- Admin: manager@markplus.com / admin123
- Employee: employee@markplus.com / employee123

---

## Langkah 6: Jalankan dengan PM2

```bash
pm2 start npm --name "markplus-meet" -- start
pm2 save
pm2 startup
```

Perintah berguna PM2:
```bash
pm2 status              # cek status
pm2 logs markplus-meet  # lihat log
pm2 restart markplus-meet  # restart
pm2 stop markplus-meet     # stop
```

---

## Langkah 7: Setup Nginx Reverse Proxy

### Tanpa Domain (Akses via IP)

```bash
sudo nano /etc/nginx/sites-available/markplus-meet
```

```nginx
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Dengan Domain

```nginx
server {
    listen 80;
    server_name meet.domainanda.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Aktifkan konfigurasi:

```bash
sudo ln -s /etc/nginx/sites-available/markplus-meet /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default  # hapus default (opsional)
sudo nginx -t                              # test konfigurasi
sudo systemctl restart nginx
```

---

## Langkah 8: Setup HTTPS dengan Let's Encrypt (Jika Pakai Domain)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d meet.domainanda.com
```

Certbot akan otomatis:
- Generate sertifikat SSL
- Mengubah config Nginx ke HTTPS
- Auto-renew setiap 90 hari

---

## Langkah 9: Buka Firewall

```bash
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 22
sudo ufw enable
```

---

## Update Aplikasi (Setelah Ada Perubahan Kode)

```bash
cd /home/markplus-meet
git pull origin main
npm install
npx prisma generate
npx prisma db push
npm run build
pm2 restart markplus-meet
```

---

## Struktur Port

| Service       | Port | Keterangan                     |
|---------------|------|--------------------------------|
| Next.js       | 3000 | Internal (diakses via Nginx)   |
| Nginx         | 80   | HTTP (redirect ke 443)         |
| Nginx         | 443  | HTTPS (akses publik)           |
| PostgreSQL    | 5432 | Database VPS                   |

---

## Troubleshooting

### App tidak bisa diakses
```bash
pm2 status                    # pastikan app running
pm2 logs markplus-meet        # cek error log
sudo systemctl status nginx   # pastikan nginx running
sudo nginx -t                 # cek config nginx
```

### Database connection error
```bash
# Test koneksi dari VPS
psql "postgresql://USER:PASSWORD@145.79.10.104:5432/markplus_meet"
```

### Build error setelah update
```bash
rm -rf .next node_modules
npm install
npm run build
```

### Cek penggunaan resource
```bash
htop                    # CPU & RAM
df -h                   # disk space
pm2 monit               # monitoring PM2
```

---

## Catatan Penting

1. **Jangan lupa** ganti `NEXTAUTH_URL` ke URL produksi (bukan localhost)
2. **Backup database** secara berkala: `pg_dump -U user markplus_meet > backup.sql`
3. **File `.env` jangan di-commit** ke GitHub (sudah ada di .gitignore)
4. **Ganti password default** user setelah deploy pertama kali
5. Next.js production berjalan di **port 3000** secara default, Nginx yang handle port 80/443
