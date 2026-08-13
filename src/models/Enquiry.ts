import mongoose, { Schema, Document } from 'mongoose';

/**
 * Enquiry — a message from the public contact form: the /contact page and the
 * compact form in the site footer. Stored so staff can work through them in the
 * admin queue (/admin/enquiries); the form also emails the shop. PII
 * (email/phone/message) is never logged (root CLAUDE.md rule #6). Distinct from
 * the B2B WholesaleEnquiry and the CustomOrder medicine-sourcing request.
 */
export interface IEnquiry extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
  /** Which form the message came from. */
  source: 'contact' | 'footer';
  status: 'new' | 'read' | 'replied' | 'closed';
  createdAt: Date;
  updatedAt: Date;
}

const EnquirySchema = new Schema<IEnquiry>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    subject: { type: String, trim: true },
    message: { type: String, required: true, trim: true },
    source: { type: String, enum: ['contact', 'footer'], default: 'contact' },
    status: {
      type: String,
      enum: ['new', 'read', 'replied', 'closed'],
      default: 'new',
      index: true,
    },
  },
  { timestamps: true }
);

export default mongoose.models.Enquiry ||
  mongoose.model<IEnquiry>('Enquiry', EnquirySchema);
