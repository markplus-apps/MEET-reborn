import { Resend } from "resend";
import { formatWIB } from "./timezone";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

interface BookingEmailData {
  userName: string;
  userEmail: string;
  roomName: string;
  title: string;
  startTime: Date;
  endTime: Date;
  status: "CONFIRMED" | "CANCELLED";
}

export async function sendBookingEmail(data: BookingEmailData) {
  if (!resend) {
    console.log("[Email] Resend not configured, skipping email notification");
    return;
  }

  const dateStr = formatWIB(data.startTime, "EEEE, dd MMMM yyyy");
  const startStr = formatWIB(data.startTime, "HH:mm");
  const endStr = formatWIB(data.endTime, "HH:mm");

  const isConfirmed = data.status === "CONFIRMED";
  const subject = isConfirmed
    ? `Booking Confirmed: ${data.title} - ${data.roomName}`
    : `Booking Cancelled: ${data.title} - ${data.roomName}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f7; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
        .header { background: ${isConfirmed ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" : "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"}; padding: 40px 32px; text-align: center; }
        .header h1 { color: white; font-size: 24px; margin: 0 0 8px; font-weight: 600; }
        .header p { color: rgba(255,255,255,0.9); font-size: 14px; margin: 0; }
        .body { padding: 32px; }
        .detail { display: flex; padding: 16px 0; border-bottom: 1px solid #f0f0f0; }
        .detail-label { color: #86868b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; width: 120px; flex-shrink: 0; }
        .detail-value { color: #1d1d1f; font-size: 15px; font-weight: 500; }
        .status { display: inline-block; padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: 600; background: ${isConfirmed ? "#e8f5e9" : "#fce4ec"}; color: ${isConfirmed ? "#2e7d32" : "#c62828"}; }
        .footer { padding: 24px 32px; background: #f5f5f7; text-align: center; }
        .footer p { color: #86868b; font-size: 12px; margin: 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${isConfirmed ? "Booking Confirmed" : "Booking Cancelled"}</h1>
          <p>MarkPlus Meet</p>
        </div>
        <div class="body">
          <p style="color: #1d1d1f; font-size: 16px; margin: 0 0 24px;">Hi ${data.userName},</p>
          <p style="color: #6e6e73; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
            ${isConfirmed ? "Your meeting room booking has been confirmed." : "Your meeting room booking has been cancelled."}
          </p>
          <div class="detail"><span class="detail-label">Room</span><span class="detail-value">${data.roomName}</span></div>
          <div class="detail"><span class="detail-label">Meeting</span><span class="detail-value">${data.title}</span></div>
          <div class="detail"><span class="detail-label">Date</span><span class="detail-value">${dateStr}</span></div>
          <div class="detail"><span class="detail-label">Time</span><span class="detail-value">${startStr} - ${endStr} WIB</span></div>
          <div class="detail" style="border: none;"><span class="detail-label">Status</span><span class="status">${data.status}</span></div>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} MarkPlus Meet. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await resend.emails.send({
      from: "MarkPlus Meet <onboarding@resend.dev>",
      to: data.userEmail,
      subject,
      html,
    });
    console.log(`[Email] Sent ${data.status} email to ${data.userEmail}`);
  } catch (error) {
    console.error("[Email] Failed to send:", error);
  }
}
