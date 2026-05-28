import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  // ─── App ──────────────────────────────────────────────────
  PORT: Joi.number().default(3000),
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),

  // ─── Database ─────────────────────────────────────────────
  DATABASE_URL: Joi.string().required(),

  // ─── JWT ──────────────────────────────────────────────────
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('7d'),

  // ─── Email domain validasi customer ──────────────────────
  SCHOOL_EMAIL_DOMAIN: Joi.string().default('student.smktelkom-mlg.sch.id'),

  // ─── Resend (email / OTP) ─────────────────────────────────
  RESEND_API_KEY: Joi.string().required(),
  RESEND_FROM_EMAIL: Joi.string().email().required(),

  // ─── Cloudinary ───────────────────────────────────────────
  CLOUDINARY_CLOUD_NAME: Joi.string().required(),
  CLOUDINARY_API_KEY: Joi.string().required(),
  CLOUDINARY_API_SECRET: Joi.string().required(),

  // ─── Xendit (QRIS) ─────────────────────────────────────────
  XENDIT_SECRET_KEY: Joi.string().required(),
  XENDIT_WEBHOOK_SECRET: Joi.string().required(),
  QRIS_SERVICE_FEE_PERCENT: Joi.number().default(5),

  // ─── OTP config ───────────────────────────────────────────
  OTP_TTL_MINUTES: Joi.number().default(5),
  OTP_COOLDOWN_SECONDS: Joi.number().default(60),
  OTP_MAX_PER_HOUR: Joi.number().default(5),

  // ─── Admin seed ───────────────────────────────────────────
  ADMIN_SEED_EMAILS: Joi.string().required(),
  ADMIN_SEED_PASSWORDS: Joi.string().required(),
  ADMIN_SEED_NAMES: Joi.string().required(),
  SEED_ON_BOOT: Joi.boolean().default(false),
});