import mongoose, { Schema, Document } from 'mongoose';

export interface IAdminActivity extends Document {
  adminId: mongoose.Types.ObjectId;
  adminName: string;
  adminEmail: string;
  action: string; // e.g., 'order_status_updated', 'refund_processed', 'user_role_changed'
  entityType: 'order' | 'user' | 'product' | 'payment' | 'shipment' | 'return' | 'system';
  entityId?: mongoose.Types.ObjectId;
  entityIdentifier?: string; // Human-readable identifier (order number, email, etc.)
  details?: any; // Additional details about the action
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

const AdminActivitySchema = new Schema<IAdminActivity>(
  {
    adminId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    adminName: {
      type: String,
      required: true,
    },
    adminEmail: {
      type: String,
      required: true,
    },
    action: {
      type: String,
      required: true,
    },
    entityType: {
      type: String,
      enum: ['order', 'user', 'product', 'payment', 'shipment', 'return', 'system'],
      required: true,
    },
    entityId: {
      type: Schema.Types.ObjectId,
    },
    entityIdentifier: {
      type: String,
    },
    details: Schema.Types.Mixed,
    ipAddress: String,
    userAgent: String,
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Indexes for efficient queries
AdminActivitySchema.index({ adminId: 1, createdAt: -1 });
AdminActivitySchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
AdminActivitySchema.index({ action: 1, createdAt: -1 });
AdminActivitySchema.index({ createdAt: -1 }); // For recent activity queries

// TTL index to automatically delete old logs (keep for 90 days)
AdminActivitySchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 days

const AdminActivity =
  mongoose.models.AdminActivity ||
  mongoose.model<IAdminActivity>('AdminActivity', AdminActivitySchema);

export default AdminActivity;
