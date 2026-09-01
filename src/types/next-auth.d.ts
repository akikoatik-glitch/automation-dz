import 'next-auth';
import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: string;
      lang: string;
      currentBusinessId?: string | null;
    } & DefaultSession['user'];
    businessId?: string | null;
  }

  interface User {
    id: string;
    role?: string;
    lang?: string;
    currentBusinessId?: string | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    uid?: string;
    role?: string;
    lang?: string;
    biz?: string | null;
  }
}