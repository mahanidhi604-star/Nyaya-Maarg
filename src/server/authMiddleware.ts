import type { IncomingMessage } from 'node:http';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

export interface AuthCheckResult {
  isAuthenticated: boolean;
  isGuest: boolean;
  userId?: string;
  error?: string;
}

export async function verifyUserToken(req: IncomingMessage & { body?: any }, allowGuest: boolean = false): Promise<AuthCheckResult> {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  let token: string | null = null;

  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  }

  // If token is present, verify with Supabase
  if (token) {
    if (supabaseUrl && supabaseAnonKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
          auth: { persistSession: false },
        });
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (user && !error) {
          return { isAuthenticated: true, isGuest: false, userId: user.id };
        }
        return { isAuthenticated: false, isGuest: false, error: 'Unauthorized: invalid or expired session token' };
      } catch (err: any) {
        return { isAuthenticated: false, isGuest: false, error: 'Unauthorized: token verification failed' };
      }
    } else {
      return { isAuthenticated: false, isGuest: false, error: 'Unauthorized: auth service not configured to verify tokens' };
    }
  }

  // Check for explicit guest request if allowed
  const guestHeader = req.headers['x-nyaya-guest'] || req.headers['x-guest-mode'];
  const isGuestClaim = guestHeader === 'true' || req.body?.isGuest === true;

  if (allowGuest && isGuestClaim) {
    return { isAuthenticated: false, isGuest: true, userId: 'guest_user' };
  }

  return {
    isAuthenticated: false,
    isGuest: false,
    error: 'Unauthorized: Missing or invalid access token',
  };
}
