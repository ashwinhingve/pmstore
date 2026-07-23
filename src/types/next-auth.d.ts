import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      image?: string;
      role: 'client' | 'staff' | 'admin';
      phoneNumber?: string;
    };
  }

  interface User {
    id: string;
    email?: string | null;
    name?: string | null;
    image?: string | null;
    role?: 'client' | 'staff' | 'admin';
    phoneNumber?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    email: string;
    name: string;
    picture?: string;
    role: 'client' | 'staff' | 'admin';
    phoneNumber?: string;
  }
}
