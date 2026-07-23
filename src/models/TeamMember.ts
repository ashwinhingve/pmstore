import mongoose, { Schema, Document } from 'mongoose';

export interface ITeamMember extends Document {
  name: string;
  designation: string;
  photo: string;
  photoPublicId: string;
  bio: string;
  linkedin: string;
  twitter: string;
  email: string;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TeamMemberSchema = new Schema<ITeamMember>(
  {
    name: { type: String, required: true, trim: true },
    designation: { type: String, required: true, trim: true },
    photo: { type: String, default: '' },
    photoPublicId: { type: String, default: '' },
    bio: { type: String, default: '' },
    linkedin: { type: String, default: '' },
    twitter: { type: String, default: '' },
    email: { type: String, default: '' },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.models.TeamMember ||
  mongoose.model<ITeamMember>('TeamMember', TeamMemberSchema);
