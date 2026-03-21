import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function useAdmin() {
    const [isAdmin, setIsAdmin] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const checkAdmin = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) {
                setIsAdmin(false);
                setLoading(false);
                return;
            }

            // High security check: master admin is dretty156@gmail.com
            const isMasterEmail = session.user.email === 'dretty156@gmail.com';

            // Database check
            const { data, error } = await supabase
                .from('profiles')
                .select('is_admin')
                .eq('id', session.user.id)
                .single();

            if (error) {
                console.error('Error checking admin status:', error);
                setIsAdmin(isMasterEmail); // Fallback to email check
            } else {
                setIsAdmin(data?.is_admin || isMasterEmail);
            }
            setLoading(false);
        };

        checkAdmin();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                const isMasterEmail = session.user.email === 'dretty156@gmail.com';
                // Trigger re-check or just set it based on email for immediate UI update
                setIsAdmin(isMasterEmail);
                checkAdmin();
            } else {
                setIsAdmin(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    return { isAdmin, loading };
}
