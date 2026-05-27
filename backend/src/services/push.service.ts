import webpush from "web-push";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";

class PushService {
  private _ready = false;

  async init() {
    if (this._ready) return;

    let publicKey = env.VAPID_PUBLIC_KEY;
    let privateKey = env.VAPID_PRIVATE_KEY;

    if (!publicKey || !privateKey) {
      const storedPub = await prisma.setting.findUnique({ where: { key: "vapid_public_key" } });
      const storedPriv = await prisma.setting.findUnique({ where: { key: "vapid_private_key" } });

      if (storedPub?.value && storedPriv?.value) {
        publicKey = storedPub.value;
        privateKey = storedPriv.value;
      } else {
        const keys = webpush.generateVAPIDKeys();
        publicKey = keys.publicKey;
        privateKey = keys.privateKey;
        await prisma.setting.upsert({
          where: { key: "vapid_public_key" },
          create: { key: "vapid_public_key", value: keys.publicKey, type: "string", group: "system", label: "VAPID Public Key" },
          update: { value: keys.publicKey },
        });
        await prisma.setting.upsert({
          where: { key: "vapid_private_key" },
          create: { key: "vapid_private_key", value: keys.privateKey, type: "string", group: "system", label: "VAPID Private Key" },
          update: { value: keys.privateKey },
        });
      }
    }

    webpush.setVapidDetails(env.VAPID_SUBJECT, publicKey, privateKey);
    this._ready = true;
  }

  async getPublicKey(): Promise<string> {
    const pub = env.VAPID_PUBLIC_KEY;
    if (pub) return pub;
    const stored = await prisma.setting.findUnique({ where: { key: "vapid_public_key" } });
    return stored?.value || "";
  }

  async saveSubscription(userId: string, sub: { endpoint: string; keys: { p256dh: string; auth: string } }) {
    await prisma.pushSubscription.upsert({
      where: { userId_endpoint: { userId, endpoint: sub.endpoint } },
      create: { userId, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
      update: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    });
  }

  async removeSubscription(userId: string, endpoint: string) {
    await prisma.pushSubscription.deleteMany({ where: { userId, endpoint } });
  }

  async removeAllSubscriptions(userId: string) {
    await prisma.pushSubscription.deleteMany({ where: { userId } });
  }

  async sendToUser(userId: string, payload: { title: string; body: string; icon?: string; badge?: string; data?: any }) {
    if (!this._ready) await this.init();
    const subs = await prisma.pushSubscription.findMany({ where: { userId } });
    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload),
        );
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await prisma.pushSubscription.deleteMany({ where: { userId, endpoint: sub.endpoint } });
        }
      }
    }
  }
}

export const pushService = new PushService();
