import { Request, Response, NextFunction } from "express";
import { userService } from "../services/user.service.js";
import { mediaService } from "../services/media.service.js";
import { pushService } from "../services/push.service.js";

export async function getUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const search = req.query.search as string | undefined;
    const users = await userService.getUsers(req.userId!, search);
    res.json(users);
  } catch (err) { next(err); }
}

export async function getUserById(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await userService.getUserById(req.params.userId as string);
    res.json(user);
  } catch (err) { next(err); }
}

export async function updateProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await userService.updateProfile(req.userId!, req.body);
    res.json(user);
  } catch (err) { next(err); }
}

export async function uploadAvatar(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No file provided" });
      return;
    }
    mediaService.validateFile(req.file);

    const currentUser = await userService.getUserById(req.userId!);
    if (currentUser?.avatar) {
      const oldUrl = currentUser.avatar;
      if (oldUrl.startsWith("/uploads/")) {
        const parts = oldUrl.replace("/uploads/", "").split("/");
        const fileName = parts.pop()!;
        const folder = parts.join("/");
        await mediaService.deleteFile(fileName, folder).catch(() => {});
      } else if (oldUrl.includes("cloudinary.com")) {
        try {
          const urlParts = oldUrl.split("/");
          const versionIdx = urlParts.findIndex((p) => p.startsWith("v") && /^\d+$/.test(p.slice(1)));
          if (versionIdx !== -1) {
            const publicIdWithExt = urlParts.slice(versionIdx + 1).join("/");
            const publicId = publicIdWithExt.replace(/\.[^.]+$/, "");
            await mediaService.deleteFile(publicId);
          }
        } catch {}
      }
    }

    const result = await mediaService.uploadFile(req.file, "wavechat/avatars");
    const user = await userService.updateProfile(req.userId!, { avatar: result.url });
    res.json(user);
  } catch (err) { next(err); }
}

export async function blockUser(req: Request, res: Response, next: NextFunction) {
  try {
    await userService.blockUser(req.userId!, req.params.userId as string);
    res.json({ message: "User blocked" });
  } catch (err) { next(err); }
}

export async function unblockUser(req: Request, res: Response, next: NextFunction) {
  try {
    await userService.unblockUser(req.userId!, req.params.userId as string);
    res.json({ message: "User unblocked" });
  } catch (err) { next(err); }
}

export async function getBlockedUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const blocked = await userService.getBlockedUsers(req.userId!);
    res.json(blocked);
  } catch (err) { next(err); }
}

export async function getStarredMessages(req: Request, res: Response, next: NextFunction) {
  try {
    const starred = await userService.getStarredMessages(req.userId!);
    res.json(starred);
  } catch (err) { next(err); }
}

export async function starMessage(req: Request, res: Response, next: NextFunction) {
  try {
    await userService.starMessage(req.userId!, req.params.messageId as string);
    res.json({ message: "Message starred" });
  } catch (err) { next(err); }
}

export async function unstarMessage(req: Request, res: Response, next: NextFunction) {
  try {
    await userService.unstarMessage(req.userId!, req.params.messageId as string);
    res.json({ message: "Message unstarred" });
  } catch (err) { next(err); }
}

export async function getVapidPublicKey(_req: Request, res: Response, next: NextFunction) {
  try {
    const key = await pushService.getPublicKey();
    res.json({ publicKey: key });
  } catch (err) { next(err); }
}

export async function savePushSubscription(req: Request, res: Response, next: NextFunction) {
  try {
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      res.status(400).json({ error: "Invalid subscription" });
      return;
    }
    await pushService.saveSubscription(req.userId!, { endpoint, keys });
    res.json({ success: true });
  } catch (err) { next(err); }
}

export async function removePushSubscription(req: Request, res: Response, next: NextFunction) {
  try {
    const { endpoint } = req.body;
    if (endpoint) {
      await pushService.removeSubscription(req.userId!, endpoint);
    } else {
      await pushService.removeAllSubscriptions(req.userId!);
    }
    res.json({ success: true });
  } catch (err) { next(err); }
}
