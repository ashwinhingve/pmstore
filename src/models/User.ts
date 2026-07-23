import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  email?: string;
  password?: string;
  fullName?: string;
  name?: string;
  phoneNumber?: string;
  image?: string;
  provider?: 'google' | 'email' | 'sms';
  googleId?: string;
  role: 'client' | 'admin';
  emailVerified: boolean;
  mobileVerified: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      minlength: 6,
      select: false, // Don't return password by default
    },
    fullName: {
      type: String,
      trim: true,
    },
    name: {
      type: String,
      trim: true,
    },
    phoneNumber: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },
    image: {
      type: String,
    },
    provider: {
      type: String,
      enum: ['google', 'email', 'sms'],
    },
    googleId: {
      type: String,
      sparse: true,
      unique: true,
    },
    role: {
      type: String,
      enum: ['client', 'admin'],
      default: 'client',
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    mobileVerified: {
      type: Boolean,
      default: false,
    },
    lastLogin: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Strip null/empty email so sparse unique index works correctly for mobile OTP users
UserSchema.pre('save', function (next) {
  if (this.email === null || this.email === '') {
    this.email = undefined;
  }
  next();
});

// Explicit sparse unique index (ensures MongoDB index matches schema even after migrations)
UserSchema.index({ email: 1 }, { unique: true, sparse: true });

// Hash password before saving (only for credentials provider)
UserSchema.pre('save', async function (next) {
  // Skip if password is not modified or doesn't exist (Google OAuth users)
  if (!this.password || !this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);

    // Set email as verified for Google OAuth users
    if (this.provider === 'google') {
      this.emailVerified = true;
    }

    next();
  } catch (error: any) {
    next(error);
  }
});

// Method to compare password (only for credentials provider)
UserSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  if (!this.password) {
    return false;
  }
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
