```ts
export function otpEmailTemplate(
  name: string,
  code: string,
  ttlMinutes: number
): string {
  return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verifikasi OTP KantinKlik</title>
</head>

<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,sans-serif;color:#18181b;">
  
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr>
      <td align="center">

        <table width="100%" cellpadding="0" cellspacing="0"
          style="
            max-width:520px;
            background:#ffffff;
            border-radius:16px;
            overflow:hidden;
            box-shadow:0 4px 20px rgba(0,0,0,0.06);
          "
        >

          <!-- Header -->
          <tr>
            <td
              style="
                background:#dc2626;
                padding:28px 32px;
                text-align:center;
              "
            >
              <h1
                style="
                  margin:0;
                  font-size:28px;
                  color:#ffffff;
                  font-weight:700;
                  letter-spacing:0.5px;
                "
              >
                KantinKlik
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:40px 32px;">

              <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">
                Halo <strong>${name}</strong>,
              </p>

              <p
                style="
                  margin:0 0 24px;
                  font-size:15px;
                  line-height:1.8;
                  color:#52525b;
                "
              >
                Gunakan kode OTP berikut untuk memverifikasi akun kamu di KantinKlik.
              </p>

              <!-- OTP Box -->
              <div
                style="
                  background:#fef2f2;
                  border:1px solid #fecaca;
                  border-radius:14px;
                  padding:24px;
                  text-align:center;
                  margin:32px 0;
                "
              >
                <div
                  style="
                    font-size:42px;
                    font-weight:700;
                    letter-spacing:10px;
                    color:#dc2626;
                  "
                >
                  ${code}
                </div>
              </div>

              <p
                style="
                  margin:0 0 12px;
                  font-size:15px;
                  color:#52525b;
                  line-height:1.7;
                "
              >
                Kode ini berlaku selama
                <strong style="color:#18181b;">
                  ${ttlMinutes} menit
                </strong>.
              </p>

              <p
                style="
                  margin:32px 0 0;
                  font-size:13px;
                  line-height:1.7;
                  color:#71717a;
                "
              >
                Jika kamu tidak merasa melakukan pendaftaran atau login di KantinKlik,
                kamu dapat mengabaikan email ini dengan aman.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td
              style="
                border-top:1px solid #e4e4e7;
                padding:20px 32px;
                text-align:center;
                font-size:12px;
                color:#a1a1aa;
              "
            >
              © ${new Date().getFullYear()} KantinKlik. All rights reserved.
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
  `.trim();
}
```
