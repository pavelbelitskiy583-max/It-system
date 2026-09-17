// Отправка транзакционных писем через Resend (https://resend.com).
// Требует переменные окружения RESEND_API_KEY и (опционально) RESEND_FROM_EMAIL.
import { ApiError } from "./auth.js";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "ECHOIT <onboarding@resend.dev>";

export async function sendVerificationEmail(to, code) {
  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY не задан в переменных окружения — письмо не отправлено.");
    throw new ApiError(500, "Отправка почты не настроена на сервере. Обратитесь к администратору проекта.");
  }

  const html = `
    <div style="font-family:Helvetica,Arial,sans-serif;background:#fff;color:#000;padding:32px;max-width:420px;margin:0 auto">
      <div style="font-size:22px;font-weight:600;letter-spacing:-0.01em;margin-bottom:24px">ECHOIT</div>
      <p style="font-size:15px;line-height:1.6;color:#333;margin:0 0 20px">
        Код подтверждения для создания организации в ECHOIT:
      </p>
      <div style="font-size:34px;font-weight:700;letter-spacing:0.12em;background:#f3f3f3;padding:16px 20px;text-align:center;border-radius:10px;margin-bottom:20px">
        ${code}
      </div>
      <p style="font-size:12px;line-height:1.6;color:#888;margin:0">
        Код действует 15 минут. Если вы не запрашивали регистрацию — просто игнорируйте это письмо.
      </p>
    </div>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [to],
      subject: `Код подтверждения: ${code}`,
      html,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.error("Resend API error:", res.status, errText);
    throw new ApiError(502, "Не удалось отправить письмо с кодом. Проверьте настройки почтового домена.");
  }
}
