import nodemailer from "nodemailer";
import { authenticator } from "otplib";
import { env } from "../config/env.js";

interface NotificationPayload {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export class NotificationService {
  private transporter: nodemailer.Transporter | null = null;

  private getTransporter() {
    if (!this.transporter && env.SMTP_USER) {
      this.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465,
        auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
      });
    }
    return this.transporter;
  }

  async sendEmailOtp(email: string): Promise<string> {
    const otp = authenticator.generate(env.JWT_SECRET + email);
    const transporter = this.getTransporter();

    if (transporter) {
      await transporter.sendMail({
        from: env.SMTP_USER,
        to: email,
        subject: "WaveChat - Your OTP Code",
        html: `<h2>Your OTP Code</h2><p>Use this code to verify your account: <strong>${otp}</strong></p><p>This code expires in 10 minutes.</p>`,
      });
    }

    return otp;
  }

  async verifyOtp(email: string, otp: string): Promise<boolean> {
    try {
      return authenticator.check(otp, env.JWT_SECRET + email);
    } catch {
      return false;
    }
  }

  async sendPushNotification(payload: NotificationPayload): Promise<void> {
    // Placeholder for FCM/APNs integration
    console.log(`[Notification] To: ${payload.userId}, Title: ${payload.title}`);
  }

  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    const transporter = this.getTransporter();
    if (!transporter) {
      console.warn("Email not configured, skipping");
      return;
    }
    await transporter.sendMail({ from: env.SMTP_USER, to, subject, html });
  }
}

export const notificationService = new NotificationService();
