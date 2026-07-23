import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { connectDB } from './mongodb';
import User from '@/models/User';
import Otp from '@/models/Otp';
import { emailService } from '@/lib/notifications/email';

// Validate required environment variables
if (!process.env.NEXTAUTH_SECRET) {
  throw new Error('NEXTAUTH_SECRET is not set in environment variables');
}

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.warn('Google OAuth credentials are not configured. Google sign-in will not work.');
}

// Admin email whitelist - only these emails get admin role
const ADMIN_EMAILS = ['taptiagrofood@gmail.com'];

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      },
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          emailVerified: profile.email_verified,
        };
      },
    }),
    CredentialsProvider({
      id: 'mobile-otp',
      name: 'Mobile OTP',
      credentials: {
        phone: { label: 'Phone', type: 'text' },
        otp: { label: 'OTP', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.phone || !credentials?.otp) {
          throw new Error('Mobile number and OTP are required');
        }

        // Normalize to 10-digit number
        const phoneMatch = credentials.phone.trim().replace(/\s/g, '').match(/^(?:\+91|91|0)?([6-9]\d{9})$/);
        if (!phoneMatch) {
          throw new Error('Invalid mobile number format');
        }
        const phone = phoneMatch[1];

        await connectDB();

        const otpRecord = await Otp.findOne({ phoneNumber: phone, expiresAt: { $gt: new Date() } });

        if (!otpRecord) {
          throw new Error('OTP expired or not found. Please request a new one.');
        }

        if (otpRecord.attempts >= 3) {
          await Otp.deleteOne({ _id: otpRecord._id });
          throw new Error('Too many failed attempts. Please request a new OTP.');
        }

        const isValid = await bcrypt.compare(credentials.otp, otpRecord.otp);

        if (!isValid) {
          otpRecord.attempts += 1;
          await otpRecord.save();
          const remaining = 3 - otpRecord.attempts;
          throw new Error(
            remaining > 0
              ? `Invalid OTP. ${remaining} attempt(s) remaining.`
              : 'Too many failed attempts. Please request a new OTP.'
          );
        }

        // OTP valid - delete it (one-time use)
        await Otp.deleteOne({ _id: otpRecord._id });

        // Find user by phone number — link to existing account or create new
        let user = await User.findOne({ phoneNumber: phone });

        if (!user) {
          user = await User.create({
            phoneNumber: phone,
            provider: 'sms',
            role: 'client',
            mobileVerified: true,
          });
          console.log('New mobile user created:', phone);
          // No email for SMS-only users — skip welcome email
        } else {
          user.mobileVerified = true;
          user.lastLogin = new Date();
          await user.save();
        }

        return {
          id: user._id.toString(),
          email: user.email || null,
          name: user.name || user.fullName || null,
          image: user.image || null,
        };
      },
    }),
    CredentialsProvider({
      id: 'email-otp',
      name: 'Email OTP',
      credentials: {
        email: { label: 'Email', type: 'email' },
        otp: { label: 'OTP', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.otp) {
          throw new Error('Email and OTP are required');
        }

        const email = credentials.email.toLowerCase().trim();

        await connectDB();

        const otpRecord = await Otp.findOne({ email, expiresAt: { $gt: new Date() } });

        if (!otpRecord) {
          throw new Error('OTP expired or not found. Please request a new one.');
        }

        if (otpRecord.attempts >= 3) {
          await Otp.deleteOne({ _id: otpRecord._id });
          throw new Error('Too many failed attempts. Please request a new OTP.');
        }

        const isValid = await bcrypt.compare(credentials.otp, otpRecord.otp);

        if (!isValid) {
          otpRecord.attempts += 1;
          await otpRecord.save();
          const remaining = 3 - otpRecord.attempts;
          throw new Error(
            remaining > 0
              ? `Invalid OTP. ${remaining} attempt(s) remaining.`
              : 'Too many failed attempts. Please request a new OTP.'
          );
        }

        // OTP valid - delete it (one-time use)
        await Otp.deleteOne({ _id: otpRecord._id });

        // Find or create user
        let user = await User.findOne({ email });

        if (!user) {
          const userRole = ADMIN_EMAILS.includes(email) ? 'admin' : 'client';
          user = await User.create({
            email,
            provider: 'email',
            role: userRole,
            emailVerified: true,
          });
          console.log('New email user created:', email, 'role:', userRole);
          emailService.sendWelcomeEmail(email, null).catch(() => {});
        } else {
          // Update admin status if needed
          const shouldBeAdmin = ADMIN_EMAILS.includes(email);
          if (shouldBeAdmin && user.role !== 'admin') {
            user.role = 'admin';
          } else if (!shouldBeAdmin && user.role === 'admin') {
            user.role = 'client';
          }
          user.lastLogin = new Date();
          await user.save();
        }

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name || user.fullName || null,
          image: user.image || null,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google') {
        try {
          await connectDB();

          // Check if user already exists by email or googleId
          const existingUser = await User.findOne({
            $or: [
              { email: user.email },
              { googleId: profile?.sub }
            ]
          });

          if (!existingUser) {
            // Determine role - admin for whitelisted emails, client for others
            const userRole = ADMIN_EMAILS.includes(user.email?.toLowerCase() || '') ? 'admin' : 'client';

            const newUser = await User.create({
              email: user.email,
              name: user.name,
              fullName: user.name,
              image: user.image,
              provider: 'google',
              googleId: profile?.sub,
              role: userRole,
              emailVerified: true,
            });

            console.log('New user created:', newUser.email, 'role:', userRole);
            emailService.sendWelcomeEmail(newUser.email, newUser.name || null).catch(() => {});
          } else {
            // Ensure admin emails always have admin role
            const shouldBeAdmin = ADMIN_EMAILS.includes(existingUser.email?.toLowerCase() || '');
            if (shouldBeAdmin && existingUser.role !== 'admin') {
              existingUser.role = 'admin';
            } else if (!shouldBeAdmin && existingUser.role === 'admin') {
              existingUser.role = 'client';
            }
            // Update existing user if needed
            let updated = false;

            if (!existingUser.googleId && profile?.sub) {
              existingUser.googleId = profile.sub;
              updated = true;
            }

            if (user.image && existingUser.image !== user.image) {
              existingUser.image = user.image;
              updated = true;
            }

            if (!existingUser.emailVerified) {
              existingUser.emailVerified = true;
              updated = true;
            }

            // Update last login
            existingUser.lastLogin = new Date();
            updated = true;

            if (updated) {
              await existingUser.save();
              console.log('User updated:', existingUser.email);
            }
          }

          return true;
        } catch (error) {
          console.error('Sign in error:', error);
          return false;
        }
      }

      return true;
    },
    async jwt({ token, user, trigger, session, account }) {
      // On initial sign in, add user info to token
      if (user) {
        try {
          await connectDB();
          // For credentials providers user.id is a MongoDB ObjectId string.
          // For Google OAuth user.id is the Google sub — not a valid ObjectId, so always look up by email first.
          let dbUser = null;
          if (user.email) {
            dbUser = await User.findOne({ email: user.email });
          }
          if (!dbUser && user.id) {
            // Credentials (mobile OTP) — user.id is a real MongoDB ObjectId
            dbUser = await User.findById(user.id).catch(() => null);
          }

          if (dbUser) {
            token.id = dbUser._id.toString();
            token.email = dbUser.email || '';
            token.name = dbUser.name || dbUser.fullName;
            token.picture = dbUser.image;
            token.role = dbUser.role;
            token.phoneNumber = dbUser.phoneNumber;
          }
        } catch (error) {
          console.error('JWT callback error:', error);
        }
      }

      // On session update, only allow safe user-facing fields (never role/id)
      if (trigger === 'update' && session) {
        if (session.user?.name !== undefined) token.name = session.user.name;
        if (session.user?.image !== undefined) token.picture = session.user.image;
      }

      // Backfill token.id for old sessions that predate this field
      if (!token.id && (token.email || token.phoneNumber)) {
        try {
          await connectDB();
          const query = token.email
            ? { email: token.email }
            : { phoneNumber: token.phoneNumber };
          const dbUser = await User.findOne(query);
          if (dbUser) {
            token.id = dbUser._id.toString();
            token.role = dbUser.role;
          }
        } catch (error) {
          console.error('JWT token.id backfill error:', error);
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.image = token.picture as string;
        session.user.role = token.role as 'client' | 'admin';
        if (token.phoneNumber) {
          session.user.phoneNumber = token.phoneNumber as string;
        }
      }

      return session;
    },
    async redirect({ url, baseUrl }) {
      // Handle relative URLs (starts with /)
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }

      // Parse the URL to check its origin
      try {
        const urlObj = new URL(url);
        const baseUrlObj = new URL(baseUrl);

        // Allow same origin URLs
        if (urlObj.origin === baseUrlObj.origin) {
          return url;
        }

        // Check if URL has a callbackUrl parameter and extract it
        const callbackUrl = urlObj.searchParams.get('callbackUrl');
        if (callbackUrl) {
          // If callbackUrl is relative, append to baseUrl
          if (callbackUrl.startsWith('/')) {
            return `${baseUrl}${callbackUrl}`;
          }
          // If callbackUrl is absolute and same origin, use it
          const callbackUrlObj = new URL(callbackUrl);
          if (callbackUrlObj.origin === baseUrlObj.origin) {
            return callbackUrl;
          }
        }
      } catch (error) {
        console.error('Redirect callback error:', error);
      }

      // Default to login page for role-based redirection handling
      return `${baseUrl}/login`;
    },
  },
  pages: {
    signIn: '/login',
    error: '/auth/error',
    signOut: '/auth/signout',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
  useSecureCookies: process.env.NODE_ENV === 'production',
  events: {
    async signIn({ user }) {
      console.log('User signed in:', user.email);
    },
    async signOut({ token }) {
      console.log('User signed out:', token.email);
    },
  },
};
