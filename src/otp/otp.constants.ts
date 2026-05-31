export const OTP_TTL_MINUTES = 5;
export const OTP_COOLDOWN_SECONDS = 60;
export const OTP_MAX_PER_HOUR = 5;
export const OTP_MAX_VERIFY_ATTEMPTS = 5;
export const OTP_LENGTH = 6;

export const OTP_PURPOSE = {
  REGISTER: 'REGISTER',
  RESET_PASSWORD: 'RESET_PASSWORD',
} as const;

export type OtpPurpose = (typeof OTP_PURPOSE)[keyof typeof OTP_PURPOSE];