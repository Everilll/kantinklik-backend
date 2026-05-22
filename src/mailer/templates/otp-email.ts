export function otpEmailTemplate(name: string, code: string, ttlMinutes: number): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 0; }
    .container { max-width: 480px; margin: 40px auto; background: #fff; border-radius: 8px; padding: 32px; }
    .logo { font-size: 22px; font-weight: bold; color: #16a34a; margin-bottom: 24px; }
    .code { font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #111; text-align: center; background: #f0fdf4; padding: 16px; border-radius: 8px; margin: 24px 0; }
    .note { font-size: 13px; color: #6b7280; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">🍱 KantinKlik</div>
    <p>Halo <strong>${name}</strong>,</p>
    <p>Gunakan kode OTP berikut untuk verifikasi akun kamu:</p>
    <div class="code">${code}</div>
    <p>Kode berlaku selama <strong>${ttlMinutes} menit</strong>.</p>
    <p class="note">Jika kamu tidak merasa mendaftar di KantinKlik, abaikan email ini.</p>
  </div>
</body>
</html>
  `.trim();
}