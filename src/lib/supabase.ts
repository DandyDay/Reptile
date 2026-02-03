import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from './database.types';
import { SupabaseClient } from '@supabase/supabase-js';

// Initialize the Supabase client using the Next.js Auth Helper
// This automatically uses cookies for session management, allowing the Middleware to refresh tokens.
export const supabase = createClientComponentClient<Database>() as unknown as SupabaseClient<Database>;
