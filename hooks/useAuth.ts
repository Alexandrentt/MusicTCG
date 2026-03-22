// hooks/useAuth.ts
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

export interface AuthProfile {
    user: User | null;
    username: string;
    isAdmin: boolean;
    role: 'ADMIN' | 'PAYING' | 'FREE';
    isPaying: boolean;
    loading: boolean;
}

export function useAuth(): AuthProfile {
    const [user, setUser] = useState<User | null>(null);
    const [username, setUsername] = useState('');
    const [isAdmin, setIsAdmin] = useState(false);
    const [role, setRole] = useState<'ADMIN' | 'PAYING' | 'FREE'>('FREE');
    const [isPaying, setIsPaying] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadProfile = async (u: User) => {
            const { data } = await supabase
                .from('user_profile')
                .select('username, discovery_username, is_admin, role, is_paying')
                .eq('id', u.id)
                .maybeSingle();

            if (data) {
                setUsername(data.discovery_username || data.username || u.user_metadata?.username || '');
                setIsAdmin(data.is_admin ?? false);
                setRole((data.role as any) ?? 'FREE');
                setIsPaying(data.is_paying ?? false);
            }
            setLoading(false);
        };

        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                setUser(session.user);
                loadProfile(session.user);
            } else {
                setLoading(false);
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                setUser(session.user);
                loadProfile(session.user);
            } else {
                setUser(null);
                setUsername('');
                setIsAdmin(false);
                setRole('FREE');
                setIsPaying(false);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    return { user, username, isAdmin, role, isPaying, loading };
}
