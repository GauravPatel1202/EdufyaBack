import mongoose, { Schema, Document } from 'mongoose';

export interface IPlatformSettings extends Document {
  siteName: string;
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  emailSettings: {
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpPassword: string;
    fromEmail: string;
    fromName: string;
  };
  paymentGateway: {
    provider: 'stripe' | 'razorpay' | 'paypal';
    apiKey: string;
    secretKey: string;
    webhookSecret: string;
    enabled: boolean;
  };
  featureFlags: {
    enablePremium: boolean;
    enableAIInterviews: boolean;
    enableJobBoard: boolean;
    maintenanceMode: boolean;
    allowRegistration: boolean;
  };
  seoSettings: {
    metaTitle: string;
    metaDescription: string;
    metaKeywords: string[];
    ogImage?: string;
  };
  socialLinks: {
    facebook?: string;
    twitter?: string;
    linkedin?: string;
    instagram?: string;
    youtube?: string;
  };
  updatedBy: mongoose.Types.ObjectId;
  updatedAt: Date;
}

const PlatformSettingsSchema = new Schema<IPlatformSettings>({
  siteName: {
    type: String,
    required: true,
    default: 'Edufya'
  },
  logoUrl: String,
  faviconUrl: String,
  primaryColor: {
    type: String,
    default: '#6366f1'
  },
  secondaryColor: {
    type: String,
    default: '#a855f7'
  },
  emailSettings: {
    smtpHost: { type: String, default: 'smtp.gmail.com' },
    smtpPort: { type: Number, default: 587 },
    smtpUser: String,
    smtpPassword: String,
    fromEmail: { type: String, default: 'noreply@edufya.com' },
    fromName: { type: String, default: 'Edufya Team' }
  },
  paymentGateway: {
    provider: {
      type: String,
      enum: ['stripe', 'razorpay', 'paypal'],
      default: 'stripe'
    },
    apiKey: String,
    secretKey: String,
    webhookSecret: String,
    enabled: { type: Boolean, default: false }
  },
  featureFlags: {
    enablePremium: { type: Boolean, default: true },
    enableAIInterviews: { type: Boolean, default: true },
    enableJobBoard: { type: Boolean, default: true },
    maintenanceMode: { type: Boolean, default: false },
    allowRegistration: { type: Boolean, default: true }
  },
  seoSettings: {
    metaTitle: { type: String, default: 'Edufya - Learn, Grow, Succeed' },
    metaDescription: { type: String, default: 'Professional learning platform for career growth' },
    metaKeywords: { type: [String], default: ['learning', 'education', 'career', 'skills'] },
    ogImage: String
  },
  socialLinks: {
    facebook: String,
    twitter: String,
    linkedin: String,
    instagram: String,
    youtube: String
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Only allow one settings document
PlatformSettingsSchema.index({}, { unique: true });

export default mongoose.model<IPlatformSettings>('PlatformSettings', PlatformSettingsSchema);
