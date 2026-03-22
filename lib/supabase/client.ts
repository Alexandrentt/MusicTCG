import { createBrowserClient } from '@supabase/ssr';

/**
 * Crea un cliente de Supabase para Client Components.
 * Se crea una sola instancia (singleton) que comparte cookies con el servidor.
 */
export function createSupabaseBrowserClient() {
    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
}
