#  KantinKlik Backend

Backend API untuk sistem kantin digital **SMK Telkom Malang** — memudahkan siswa memesan makanan dari 12 kantin tanpa antri.

> Dibangun sebagai project ujian kenaikan level dengan stack NestJS + Prisma + PostgreSQL.

---

## 🚀 Tech Stack

| Layer | Teknologi |
|---|---|
| Framework | NestJS 11 + TypeScript 5 |
| ORM | Prisma 6 |
| Database | PostgreSQL (Railway) |
| Auth | JWT + Passport |
| Email / OTP | Resend.com |
| Storage | Cloudinary |
| Dokumentasi | Swagger / OpenAPI |
| Deploy | Railway |

---

## ✨ Fitur

- **Multi-role** — Customer, Vendor, Admin dengan guard berbasis role
- **Auth Customer** — Register via email sekolah + verifikasi OTP (rate limit: 5/jam, cooldown 60s)
- **Order Flow** — Checkout multi-item → Vendor accept/reject → Ready → Complete
- **Order Code** — Format `KK-YYYYMMDD-XXX`, race-safe dengan retry mechanism
- **Payment** — Strategy Pattern (Cash phase 1, slot Xendit QRIS phase 2)
- **Rating** — Per order item, hanya setelah COMPLETED, window 7 hari
- **Upload** — Gambar menu & logo vendor via Cloudinary (max 2MB, JPEG/PNG/WebP)
- **Pagination** — Semua list endpoint support `?page=&limit=`
- **Swagger** — Dokumentasi interaktif di `/api/docs`

---

## 📦 Instalasi

### Prerequisites

- Node.js 18+
- PostgreSQL (atau Railway)
- Akun [Resend](https://resend.com) untuk email OTP
- Akun [Cloudinary](https://cloudinary.com) untuk upload gambar

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
Swagger docs di `http://localhost:3000/api/docs`

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
| POST | `/orders/checkout` | Customer | Buat order |
| GET | `/orders/me` | Customer | List order saya |
| GET | `/orders/:id` | Customer | Detail order |
| POST | `/orders/:id/cancel` | Customer | Cancel order (PENDING) |

### Orders (Vendor)
| Method | Endpoint | Akses | Keterangan |
|---|---|---|---|
| GET | `/vendor/orders` | Vendor | Dashboard order masuk |
| POST | `/vendor/orders/:id/accept` | Vendor | Terima order |
| POST | `/vendor/orders/:id/reject` | Vendor | Tolak order |
| POST | `/vendor/orders/:id/ready` | Vendor | Tandai siap diambil |
| POST | `/vendor/orders/:id/complete` | Vendor | Selesaikan order |

### Ratings
| Method | Endpoint | Akses | Keterangan |
|---|---|---|---|
| POST | `/ratings` | Customer | Beri rating (post-COMPLETED) |
| GET | `/ratings/menu/:menuId` | Public | Rating per menu |
| GET | `/ratings/vendor/:vendorId` | Public | Rating per vendor |

> Dokumentasi lengkap semua endpoint tersedia di Swagger: [`/api/docs`](https://kantinklik.railway.app/api/docs)

---

## 🔄 Order Status Flow

```
PENDING ──→ ACCEPTED ──→ READY ──→ COMPLETED
       ╲──→ REJECTED
PENDING ──→ CANCELLED  (by customer)
```

---

## 🗂️ Struktur Folder

```
src/
├── auth/          # Register, OTP, Login, JWT Strategy
├── users/         # GET/PATCH /users/me
├── otp/           # Generate, verify, rate limit
├── mailer/        # Resend wrapper + email template
├── vendors/       # Public listing + vendor self profile
├── menus/         # CRUD menu by vendor
├── orders/        # Checkout, status flow, vendor dashboard
├── payment/       # Strategy Pattern (Cash + Xendit placeholder)
├── ratings/       # Rating per item, agregasi vendor
├── upload/        # Cloudinary wrapper + image validation
├── admin/         # CRUD vendor & customer by admin
├── config/        # ConfigModule + Joi env validation
└── common/        # Guards, decorators, filters, interceptors
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

---

## ⚠️ Known Risks

- **Resend dependency** — Kalau Resend down, OTP tidak terkirim. Customer bisa pakai endpoint `/auth/resend-otp` untuk coba lagi.
- **No automated tests** — Unit test dan e2e test di-skip karena deadline. Perlu ditambah sebelum production.
- **Single platform** — App dan DB di Railway, tidak ada staging environment.
- **No push notification** — Status order update hanya via polling/refresh dari frontend.

---

## 🔮 Roadmap Phase 2

- [ ] Integrasi Xendit QRIS Dynamic (pembayaran online)
- [ ] Webhook handler untuk konfirmasi pembayaran Xendit
- [ ] Push notification ke customer saat status order berubah
- [ ] Customer profile photo upload
- [ ] Unit test & e2e test

---

## 📄 Scripts

```bash
npm run start:dev        # Development dengan hot reload
npm run start:prod       # Production
npm run build            # Compile TypeScript
npm run prisma:seed      # Seed admin + kategori menu
npm run prisma:migrate:dev   # Buat migration baru (development)
npm run prisma:migrate:deploy # Jalankan migration (production)
```