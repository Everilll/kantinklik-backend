# 🍽️ KantinKlik Backend

Backend API untuk sistem kantin digital **SMK Telkom Malang** — memudahkan siswa memesan makanan dari kantin sekolah tanpa antri, dengan notifikasi real-time dan pembayaran QRIS.

> Dibangun sebagai project ujian kenaikan level dengan stack NestJS + Prisma + PostgreSQL.

---

## 🚀 Tech Stack

| Layer | Teknologi |
|---|---|
| Framework | NestJS 11 + TypeScript 5 |
| ORM | Prisma 6 |
| Database | PostgreSQL (Railway) |
| Auth | JWT + Passport |
| Real-time | Socket.IO (WebSocket) |
| Payment | Xendit QRIS Dynamic |
| Email / OTP | Resend.com |
| Storage | Cloudinary |
| Rate Limiter | @nestjs/throttler |
| Scheduled Tasks | @nestjs/schedule (Cron) |
| Dokumentasi | Swagger / OpenAPI |
| Deploy | Railway |

---

## ✨ Fitur

- **Multi-role** — Customer, Vendor, Admin dengan guard berbasis role
- **Auth Customer** — Register via email sekolah + verifikasi OTP (rate limit: 5/jam, cooldown 60s)
- **Order Flow** — Checkout multi-item → Vendor accept/reject → Ready → Complete
- **Order Code** — Format `KK-YYYYMMDD-XXX`, race-safe dengan retry mechanism
- **Payment QRIS** — Xendit QRIS Dynamic dengan Strategy Pattern (Cash + Online)
- **Webhook Xendit** — Auto-update pembayaran (PAID/FAILED/EXPIRED) + restock otomatis saat gagal
- **Real-time Notification** — WebSocket (Socket.IO) push event ke customer & vendor saat status order berubah
- **Auto-Cancel** — Scheduled task tiap 5 menit membatalkan order PENDING yang lewat 30 menit
- **Rating** — Per order item, hanya setelah COMPLETED, window 7 hari
- **Upload** — Gambar menu & logo vendor via Cloudinary (max 2MB, JPEG/PNG/WebP)
- **Pagination** — Semua list endpoint support `?page=&limit=`
- **Rate Limiting** — Global throttler (100 req/menit) untuk proteksi abuse
- **Swagger** — Dokumentasi interaktif di `/docs`

---

## 📦 Instalasi

### Prerequisites

- Node.js 18+
- PostgreSQL (atau Railway)
- Akun [Resend](https://resend.com) untuk email OTP
- Akun [Cloudinary](https://cloudinary.com) untuk upload gambar
- Akun [Xendit](https://xendit.co) untuk pembayaran QRIS (opsional, bisa pakai Cash dulu)

### Setup

```bash
# 1. Clone repo
git clone https://github.com/username/kantinklik-backend.git
cd kantinklik-backend

# 2. Install dependencies
npm install

# 3. Copy env
cp .env.example .env
# Edit .env sesuai konfigurasi kamu

# 4. Jalankan migration
npx prisma migrate dev

# 5. Seed database (admin + kategori menu)
npm run prisma:seed

# 6. Jalankan development server
npm run start:dev
```

App berjalan di `http://localhost:3000`
Swagger docs di `http://localhost:3000/docs`

---

## ⚙️ Environment Variables

Salin `.env.example` dan isi nilai berikut:

```env
# App
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/kantinklik

# JWT (minimal 32 karakter)
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d

# Email domain validasi customer
SCHOOL_EMAIL_DOMAIN=student.smktelkom-mlg.sch.id

# Resend (email OTP)
# Dev: pakai onboarding@resend.dev (tidak perlu verifikasi domain)
RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_FROM_EMAIL=onboarding@resend.dev

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Xendit (pembayaran QRIS)
XENDIT_SECRET_KEY=xnd_development_xxxxxxxxxxxx
XENDIT_WEBHOOK_SECRET=your_webhook_secret
QRIS_SERVICE_FEE_PERCENT=5

# OTP config
OTP_TTL_MINUTES=5
OTP_COOLDOWN_SECONDS=60
OTP_MAX_PER_HOUR=5

# Admin seed (pisah koma untuk multi-admin)
ADMIN_SEED_EMAILS=admin@kantinklik.com
ADMIN_SEED_PASSWORDS=Admin123!
ADMIN_SEED_NAMES=Admin Utama
SEED_ON_BOOT=false
```

---

## 📡 Endpoint Utama

Base URL: `/api`

### Auth
| Method | Endpoint | Akses | Keterangan |
|---|---|---|---|
| POST | `/auth/register-customer` | Public | Daftar customer baru |
| POST | `/auth/verify-otp` | Public | Verifikasi OTP |
| POST | `/auth/resend-otp` | Public | Kirim ulang OTP |
| POST | `/auth/login` | Public | Login semua role |

### Users
| Method | Endpoint | Akses | Keterangan |
|---|---|---|---|
| GET | `/users/me` | JWT | Profil sendiri |
| PATCH | `/users/me` | JWT | Update profil |

### Vendors (Public)
| Method | Endpoint | Akses | Keterangan |
|---|---|---|---|
| GET | `/vendors` | Public | List vendor aktif |
| GET | `/vendors/:id` | Public | Detail vendor + avgRating |
| GET | `/vendors/:id/menus` | Public | Menu vendor |

### Orders (Customer)
| Method | Endpoint | Akses | Keterangan |
|---|---|---|---|
| POST | `/orders/checkout` | Customer | Buat order (Cash / QRIS) |
| GET | `/orders/me` | Customer | List order saya (`?status=`) |
| GET | `/orders/:id` | Customer | Detail order |
| POST | `/orders/:id/cancel` | Customer | Cancel order (PENDING) |

### Orders (Vendor)
| Method | Endpoint | Akses | Keterangan |
|---|---|---|---|
| GET | `/vendor/orders` | Vendor | Dashboard order masuk (`?status=`) |
| GET | `/vendor/orders/:id` | Vendor | Detail order vendor |
| POST | `/vendor/orders/:id/accept` | Vendor | Terima order |
| POST | `/vendor/orders/:id/reject` | Vendor | Tolak order (+ alasan) |
| POST | `/vendor/orders/:id/ready` | Vendor | Tandai siap diambil |
| POST | `/vendor/orders/:id/complete` | Vendor | Selesaikan order |

### Ratings
| Method | Endpoint | Akses | Keterangan |
|---|---|---|---|
| POST | `/ratings` | Customer | Beri rating (post-COMPLETED) |
| GET | `/ratings/menu/:menuId` | Public | Rating per menu |
| GET | `/ratings/vendor/:vendorId` | Public | Rating per vendor |

### Admin
| Method | Endpoint | Akses | Keterangan |
|---|---|---|---|
| GET | `/admin/vendors` | Admin | List semua vendor (`?isActive=`) |
| POST | `/admin/vendors` | Admin | Buat akun vendor baru |
| PATCH | `/admin/vendors/:id` | Admin | Update data vendor |
| DELETE | `/admin/vendors/:id` | Admin | Nonaktifkan vendor (soft delete) |
| POST | `/admin/vendors/:id/logo` | Admin | Upload logo vendor |
| PATCH | `/admin/vendors/:id/reset-password` | Admin | Reset password vendor |
| GET | `/admin/customers` | Admin | List semua customer (`?search=`) |
| GET | `/admin/customers/:id` | Admin | Detail customer |
| PATCH | `/admin/customers/:id/verify` | Admin | Toggle verifikasi customer |
| PATCH | `/admin/customers/:id/reset-password` | Admin | Reset password customer |

### Webhooks
| Method | Endpoint | Akses | Keterangan |
|---|---|---|---|
| POST | `/webhooks/xendit` | Internal | Xendit payment callback |

> Dokumentasi lengkap semua endpoint tersedia di Swagger: [`/docs`](https://kantinklik.railway.app/docs)

---

## 🔄 Order Status Flow

```
PENDING ──→ ACCEPTED ──→ READY ──→ COMPLETED
       ╲──→ REJECTED
PENDING ──→ CANCELLED  (by customer / auto-cancel 30min)
```

### Payment Flow (QRIS)

```
Checkout (ONLINE) → Xendit QRIS Created (UNPAID)
                        ├── Webhook: SUCCEEDED → paymentStatus = PAID
                        └── Webhook: FAILED/EXPIRED → CANCELLED + restock
```

---

## 🔌 WebSocket Events

Koneksi via Socket.IO dengan JWT authentication:

```javascript
const socket = io('https://your-domain.com', {
  query: { token: 'jwt_token_here' }
});
```

### Events yang di-emit server:

| Event | Target | Payload | Keterangan |
|---|---|---|---|
| `orderUpdate` | Customer (room `user_{id}`) | `{ orderId, status, message }` | Status order berubah |
| `newOrder` | Vendor (room `vendor_{id}`) | `{ orderId, message }` | Ada pesanan baru masuk |

---

## ⏰ Scheduled Tasks

| Task | Jadwal | Keterangan |
|---|---|---|
| Auto-cancel expired orders | Setiap 5 menit | Cancel order PENDING yang > 30 menit + restock otomatis |

---

## 🗂️ Struktur Folder

```
src/
├── auth/          # Register, OTP, Login, JWT Strategy
├── user/          # GET/PATCH /users/me
├── otp/           # Generate, verify, rate limit
├── mailer/        # Resend wrapper + email template
├── vendor/        # Public listing + vendor self profile
├── menu/          # CRUD menu by vendor
├── order/         # Checkout, status flow, vendor dashboard
├── payment/       # Strategy Pattern (Cash + Xendit QRIS)
│   └── providers/ # CashProvider, XenditQrisProvider
├── rating/        # Rating per item, agregasi vendor
├── upload/        # Cloudinary wrapper + image validation
├── admin/         # CRUD vendor & customer by admin
├── events/        # WebSocket gateway (Socket.IO)
├── webhook/       # Xendit payment callback handler
├── task/          # Cron jobs (auto-cancel expired orders)
├── config/        # ConfigModule + Joi env validation
├── prisma/        # PrismaService + schema
└── common/        # Guards, decorators, filters, interceptors, hashing
    ├── guards/        # JwtAuthGuard, RolesGuard
    ├── decorators/    # @Roles, @CurrentUser
    ├── filters/       # PrismaExceptionFilter
    ├── interceptors/  # TransformInterceptor
    ├── hashing/       # Bcrypt hashing module
    ├── helpers/       # Utility helpers
    └── dto/           # PaginationDto, dll
```

---

## 🗃️ Database Schema

```
┌─────────────┐     ┌─────────────────┐     ┌──────────────┐
│    User      │────→│  VendorProfile  │────→│     Menu     │
│  (all roles) │     │  (canteen info) │     │ (food/drink) │
└──────┬───────┘     └────────┬────────┘     └──────┬───────┘
       │                      │                      │
       │         ┌────────────┴────────────┐         │
       └────────→│         Order           │←────────┘
                 │ (code, status, payment) │
                 └────────────┬────────────┘
                              │
                 ┌────────────┴────────────┐
                 │       OrderItem         │
                 │ (snapshot price & name) │
                 └────────────┬────────────┘
                              │
                 ┌────────────┴────────────┐
                 │        Rating           │
                 │  (stars 1-5, review)    │
                 └─────────────────────────┘
```

---

## 🚀 Deploy Railway

Project sudah dikonfigurasi untuk auto-deploy ke Railway setiap push ke branch `main`.

**Build command:**
```
npm install && npx prisma generate && npx prisma migrate deploy && npm run build
```

**Start command:**
```
npm run start:prod
```

**Seed admin (jalankan sekali setelah deploy pertama):**
```bash
railway run npm run prisma:seed
```

**Xendit Webhook URL (set di Xendit Dashboard):**
```
https://your-domain.railway.app/api/webhooks/xendit
```

---

## ⚠️ Known Risks

- **Resend dependency** — Kalau Resend down, OTP tidak terkirim. Customer bisa pakai endpoint `/auth/resend-otp` untuk coba lagi.
- **No automated tests** — Unit test dan e2e test di-skip karena deadline. Perlu ditambah sebelum production.
- **Single platform** — App dan DB di Railway, tidak ada staging environment.
- **Xendit sandbox** — Masih pakai development key, perlu switch ke production key untuk go-live.

---

## 🔮 Roadmap

- [ ] Unit test & e2e test
- [ ] Customer profile photo upload
- [ ] Notifikasi WhatsApp (via Fonnte/WA Gateway)
- [ ] Dashboard analytics untuk admin (total sales, top menu, dll)
- [ ] Staging environment (Railway preview deployments)
- [x] ~~Integrasi Xendit QRIS Dynamic~~
- [x] ~~Webhook handler untuk konfirmasi pembayaran Xendit~~
- [x] ~~Push notification real-time ke customer & vendor (WebSocket)~~

---

## 📄 Scripts

```bash
npm run start:dev              # Development dengan hot reload
npm run start:prod             # Production
npm run build                  # Compile TypeScript
npm run lint                   # Lint + auto-fix
npm run format                 # Prettier format
npm run prisma:seed            # Seed admin + kategori menu
npx prisma migrate dev         # Buat migration baru (development)
npx prisma migrate deploy      # Jalankan migration (production)
```

---

## 📝 License

UNLICENSED — Private project untuk SMK Telkom Malang.