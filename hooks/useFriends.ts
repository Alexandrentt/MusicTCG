// hooks/useFriends.ts
import { useState, useEffect } from 'react';
import {
    watchFriendsStatus,
    updateUserPresence,
    sendFriendRequest as apiSendRequest,
    acceptFriendRequest as apiAcceptRequest,
    rejectFriendRequest as apiRejectRequest,
    removeFriend as apiRemoveFriend,
    blockUser as apiBlockUser,
    findUserByUsername
} from '@/lib/database/supabaseFriends';
import { UserFriend, FriendRequest } from '@/types/friends';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { toast } from 'sonner';

/**
 * Hook centralizado para gestionar el sistema social del jugador
 */
export function useFriends() {
    const [user, setUser] = useState<User | null>(null);
    const [friends, setFriends] = useState<Record<string, UserFriend>>({});
    const [requests, setRequests] = useState<Record<string, FriendRequest>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setUser(session?.user || null);
            if (!session?.user) {
                setFriends({});
                setRequests({});
                setLoading(false);
            }
        };
        fetchSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user || null);
            if (!session?.user) {
                setFriends({});
                setRequests({});
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        if (!user?.id) return;

        // 1. Escuchar lista de amigos
        const unwatchFriends = watchFriendsStatus(user.id, (data) => {
            setFriends(data);
            setLoading(false);
        });

        // 2. Escuchar solicitudes pendientes
        const fetchRequests = async () => {
            const { data } = await supabase
                .from('friend_requests')
                .select('*')
                .eq('to_user_id', user.id)
                .eq('status', 'PENDING');
            
            if (data) {
                const reqMap: Record<string, FriendRequest> = {};
                data.forEach(r => {
                    reqMap[r.id] = {
                        requestId: r.id,
                        fromUserId: r.from_user_id,
                        fromUsername: r.from_username,
                        toUserId: r.to_user_id,
                        status: r.status,
                        createdAt: r.created_at
                    };
                });
                setRequests(reqMap);
            }
        };
        fetchRequests();

        const requestsChannel = supabase.channel(`requests_${user.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'friend_requests', filter: `to_user_id=eq.${user.id}` }, () => {
                fetchRequests();
            })
            .subscribe();

        // 3. Establecer presencia Online
        updateUserPresence(user.id, true);

        return () => {
            unwatchFriends();
            supabase.removeChannel(requestsChannel);
            if (user?.id) {
                updateUserPresence(user.id, false);
            }
        };
    }, [user?.id]);

    // Acciones
    const addFriend = async (username: string) => {
        const target = await findUserByUsername(username);
        if (!target) {
            toast.error("Usuario no encontrado");
            return;
        }
        await apiSendRequest({ userId: user!.id, username: user!.user_metadata?.username || user!.email?.split('@')[0] || 'User' }, target.userId);
        toast.success("Solicitud enviada");
    };

    const acceptRequest = async (requestId: string, fromUserId: string, fromUsername: string) => {
        await apiAcceptRequest(user!.id, requestId, fromUserId, fromUsername, user!.user_metadata?.username || user!.email?.split('@')[0] || 'User');
        toast.success(`Ahora eres amigo de ${fromUsername}`);
    };

    const rejectRequest = async (requestId: string) => {
        await apiRejectRequest(user!.id, requestId);
        toast.info("Solicitud rechazada");
    };

    const removeFriend = async (friendId: string) => {
        await apiRemoveFriend(user!.id, friendId);
        toast.info("Amigo eliminado");
    };

    const blockUser = async (targetId: string) => {
        await apiBlockUser(user!.id, targetId);
        toast.error("Usuario bloqueado");
    };

    return {
        friends: Object.values(friends),
        requests: Object.values(requests),
        loading,
        addFriend,
        acceptRequest,
        rejectRequest,
        removeFriend,
        blockUser
    };
}
