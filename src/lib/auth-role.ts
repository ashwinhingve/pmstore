import User from '@/models/User';
import { connectDB } from '@/lib/mongodb';

/** Never retain a privileged claim when the current database role cannot confirm it. */
export async function currentRole(userId: string): Promise<'admin' | 'staff' | 'client'> {
  try {
    await connectDB();
    const user = await User.findById(userId).select('role').lean<{ role?: string } | null>();
    return user?.role === 'admin' || user?.role === 'staff' ? user.role : 'client';
  } catch {
    return 'client';
  }
}
