import { supabase } from '../supabase';

export async function migrateGuestToUser(
    guestId: string,
    email: string,
    password: string,
    username: string
) {
    // 1. Crear usuario en Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                username
            }
        }
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('No se pudo crear el usuario');

    const user = authData.user;

    // 2. Obtener datos de guest
    const { data: guestData, error: guestError } = await supabase
        .from('guests')
        .select('*')
        .eq('id', guestId)
        .single();

    if (guestError || !guestData) {
        throw new Error('No se encontró la sesión de invitado para migrar.');
    }

    // 3. Crear perfil en Supabase
    const { error: profileError } = await supabase
        .from('users')
        .insert({
            id: user.id,
            email,
            username,
            created_at: new Date().toISOString(),
            guest_migration: {
                guestId,
                migratedAt: new Date().toISOString(),
            },
            inventory: guestData.inventory,
            wildcards: guestData.wildcards,
            discovered_cards: guestData.discovered_cards,
            stats: guestData.stats,
            decks: guestData.decks || []
        });

    if (profileError) throw profileError;

    // 4. Marcar guest como migrado
    const { error: updateGuestError } = await supabase
        .from('guests')
        .update({
            migrated_to: user.id,
            migrated_at: new Date().toISOString()
        })
        .eq('id', guestId);

    if (updateGuestError) throw updateGuestError;

    return user;
}
