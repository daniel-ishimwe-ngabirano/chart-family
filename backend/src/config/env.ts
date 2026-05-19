class EnvConfig {
  private _loaded = false;

  load() {
    if (this._loaded) return;
    this._loaded = true;
    this._validate();
  }

  private _get(key: string, def: string): string {
    return process.env[key] || def;
  }

  private _getInt(key: string, def: number): number {
    return parseInt(process.env[key] || String(def), 10);
  }

  private _required(key: string): string {
    const val = process.env[key];
    if (!val) {
      throw new Error(`Missing required env var: ${key}. Check your .env file.`);
    }
    return val;
  }

  private _validate() {
    this._required("DATABASE_URL");
    this._required("JWT_SECRET");
    this._required("JWT_REFRESH_SECRET");
    this._required("ADMIN_JWT_SECRET");
  }

  get PORT() { return this._getInt("PORT", 3000); }
  get NODE_ENV() { return this._get("NODE_ENV", "development"); }
  get DATABASE_URL() { return this._required("DATABASE_URL"); }
  get REDIS_URL() { return this._get("REDIS_URL", "redis://localhost:6379"); }
  get JWT_SECRET() { return this._required("JWT_SECRET"); }
  get JWT_REFRESH_SECRET() { return this._required("JWT_REFRESH_SECRET"); }
  get ADMIN_JWT_SECRET() { return this._required("ADMIN_JWT_SECRET"); }
  get JWT_EXPIRES_IN() { return this._get("JWT_EXPIRES_IN", "15m"); }
  get JWT_REFRESH_EXPIRES_IN() { return this._get("JWT_REFRESH_EXPIRES_IN", "7d"); }
  get GOOGLE_CLIENT_ID() { return this._get("GOOGLE_CLIENT_ID", ""); }
  get GOOGLE_CLIENT_SECRET() { return this._get("GOOGLE_CLIENT_SECRET", ""); }
  get GOOGLE_CALLBACK_URL() { return this._get("GOOGLE_CALLBACK_URL", "http://localhost:3000/api/auth/google/callback"); }
  get CLOUDINARY_CLOUD_NAME() { return this._get("CLOUDINARY_CLOUD_NAME", ""); }
  get CLOUDINARY_API_KEY() { return this._get("CLOUDINARY_API_KEY", ""); }
  get CLOUDINARY_API_SECRET() { return this._get("CLOUDINARY_API_SECRET", ""); }
  get SMTP_HOST() { return this._get("SMTP_HOST", "smtp.gmail.com"); }
  get SMTP_PORT() { return this._getInt("SMTP_PORT", 587); }
  get SMTP_USER() { return this._get("SMTP_USER", ""); }
  get SMTP_PASS() { return this._get("SMTP_PASS", ""); }
  get TWILIO_ACCOUNT_SID() { return this._get("TWILIO_ACCOUNT_SID", ""); }
  get TWILIO_AUTH_TOKEN() { return this._get("TWILIO_AUTH_TOKEN", ""); }
  get TWILIO_PHONE_NUMBER() { return this._get("TWILIO_PHONE_NUMBER", ""); }
  get FRONTEND_URL() { return this._get("FRONTEND_URL", "http://localhost:5173"); }
}

export const env = new EnvConfig();
