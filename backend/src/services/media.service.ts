import { v2 as cloudinary } from "cloudinary";
import { env } from "../config/env.js";
import { AppError } from "../middleware/errorHandler.js";
import type { FileUploadResult } from "../types/index.js";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");

export class MediaService {
  async uploadFile(
    file: Express.Multer.File,
    folder: string = "wavechat"
  ): Promise<FileUploadResult> {
    if (env.CLOUDINARY_CLOUD_NAME) {
      return this._uploadToCloudinary(file, folder);
    }
    return this._uploadToDisk(file, folder);
  }

  private async _uploadToCloudinary(
    file: Express.Multer.File,
    folder: string
  ): Promise<FileUploadResult> {
    const b64 = Buffer.from(file.buffer).toString("base64");
    const dataUri = `data:${file.mimetype};base64,${b64}`;

    const result = await cloudinary.uploader.upload(dataUri, {
      folder,
      resource_type: "auto",
      ...(file.mimetype.startsWith("video/") && { video_metadata: true }),
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      width: result.width,
      height: result.height,
      duration: result.duration ? Math.round(result.duration) : undefined,
    };
  }

  private async _uploadToDisk(
    file: Express.Multer.File,
    folder: string
  ): Promise<FileUploadResult> {
    const destDir = path.join(UPLOADS_DIR, folder);
    await fs.mkdir(destDir, { recursive: true });

    const ext = path.extname(file.originalname) || ".jpg";
    const uniqueName = `${crypto.randomUUID()}${ext}`;
    const filePath = path.join(destDir, uniqueName);

    await fs.writeFile(filePath, file.buffer);

    const url = `/uploads/${folder}/${uniqueName}`;

    return {
      url,
      publicId: uniqueName,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
    };
  }

  async uploadMultiple(files: Express.Multer.File[], folder: string = "wavechat"): Promise<FileUploadResult[]> {
    return Promise.all(files.map((file) => this.uploadFile(file, folder)));
  }

  async deleteFile(publicId: string, folder?: string): Promise<void> {
    if (env.CLOUDINARY_CLOUD_NAME) {
      try {
        await cloudinary.uploader.destroy(publicId);
      } catch {
        console.warn(`Failed to delete file from cloudinary: ${publicId}`);
      }
      return;
    }
    try {
      const filePath = path.join(UPLOADS_DIR, folder || "wavechat", publicId);
      await fs.unlink(filePath);
    } catch {
      console.warn(`Failed to delete local file: ${publicId}`);
    }
  }

  private _magicBytes: Record<string, Uint8Array[]> = {
    "image/jpeg": [new Uint8Array([0xFF, 0xD8, 0xFF])],
    "image/png": [new Uint8Array([0x89, 0x50, 0x4E, 0x47])],
    "image/gif": [new Uint8Array([0x47, 0x49, 0x46])],
    "image/webp": [new Uint8Array([0x52, 0x49, 0x46, 0x46])],
    "video/mp4": [new Uint8Array([0x00, 0x00, 0x00]), new Uint8Array([0x66, 0x74, 0x79, 0x70])],
    "video/webm": [new Uint8Array([0x1A, 0x45, 0xDF, 0xA3])],
    "audio/mpeg": [new Uint8Array([0xFF, 0xFB]), new Uint8Array([0x49, 0x44, 0x33])],
    "audio/ogg": [new Uint8Array([0x4F, 0x67, 0x67, 0x53])],
    "audio/wav": [new Uint8Array([0x52, 0x49, 0x46, 0x46])],
    "application/pdf": [new Uint8Array([0x25, 0x50, 0x44, 0x46])],
  };

  private _checkMagicBytes(file: Express.Multer.File, mimeType: string): boolean {
    const signatures = this._magicBytes[mimeType];
    if (!signatures) return true;
    const buf = new Uint8Array(file.buffer);
    return signatures.some((sig) => {
      if (buf.length < sig.length) return false;
      return sig.every((byte, i) => buf[i] === byte);
    });
  }

  validateFile(file: Express.Multer.File): void {
    const maxSize = 50 * 1024 * 1024;
    const allowedImageTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    const allowedVideoTypes = ["video/mp4", "video/webm"];
    const allowedAudioTypes = ["audio/mpeg", "audio/ogg", "audio/wav", "audio/webm"];
    const allowedDocTypes = [
      "application/pdf", "text/plain",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    const allowedTypes = [...allowedImageTypes, ...allowedVideoTypes, ...allowedAudioTypes, ...allowedDocTypes];

    if (file.size > maxSize) {
      throw new AppError("File too large. Maximum size is 50MB", 400);
    }

    const mime = file.mimetype;
    if (!allowedTypes.includes(mime) && !mime.startsWith("image/")) {
      throw new AppError(`File type ${mime} not allowed`, 400);
    }

    if (!this._checkMagicBytes(file, mime)) {
      throw new AppError(`File content does not match declared type: ${mime}`, 400);
    }
  }

  getMessageTypeFromMime(mimeType: string): string {
    if (mimeType.startsWith("image/")) return "IMAGE";
    if (mimeType.startsWith("video/")) return "VIDEO";
    if (mimeType.startsWith("audio/")) return "VOICE_NOTE";
    return "FILE";
  }
}

export const mediaService = new MediaService();
