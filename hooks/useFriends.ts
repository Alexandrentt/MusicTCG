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
} from '@/lib/database/firebaseFriends';
import { UserFriend, FriendRequest } from '@/types/friends';
import { rtdb, auth } from '@/lib/firebase';
import { ref, onValue, off } from 'firebase/database';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { toast } from 'sonner';

/**
 * Hook centralizado para gestionar el sistema social del jugador
 */
export function useFriends() {
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [friends, setFriends] = useState<Record<string, UserFriend>>({});
    const [requests, setRequests] = useState<Record<string, FriendRequest>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (!currentUser) {
                setFriends({});
                setRequests({});
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!user?.uid) return;

        // 1. Escuchar lista de amigos
        const unwatchFriends = watchFriendsStatus(user.uid, (data) => {
            setFriends(data);
            setLoading(false);
        });

        // 2. Escuchar solicitudes pendientes
        const requestsRef = ref(rtdb, `friend_requests/${user.uid}`);
        onValue(requestsRef, (snapshot) => {
            setRequests(snapshot.val() || {});
        });

        // 3. Establecer presencia Online
        updateUserPresence(user.uid, true);

        return () => {
            unwatchFriends();
            off(requestsRef);
            if (user?.uid) {
                updateUserPresence(user.uid, false);
            }
        };
    }, [user?.uid]);

    // Acciones
    const addFriend = async (username: string) => {
        const target = await findUserByUsername(username);
        if (!target) {
            toast.error("Usuario no encontrado");
            return;
        }
        await apiSendRequest({ userId: user!.uid, username: user!.displayName || 'User' }, target.userId);
        toast.success("Solicitud enviada");
    };

    const acceptRequest = async (requestId: string, fromUserId: string, fromUsername: string) => {
        await apiAcceptRequest(user!.uid, requestId, fromUserId, fromUsername, user!.displayName || 'User');
        toast.success(`Ahora eres amigo de ${fromUsername}`);
    };

    const rejectRequest = async (requestId: string) => {
        await apiRejectRequest(user!.uid, requestId);
        toast.info("Solicitud rechazada");
    };

    const removeFriend = async (friendId: string) => {
        await apiRemoveFriend(user!.uid, friendId);
        toast.info("Amigo eliminado");
    };

    const blockUser = async (targetId: string) => {
        await apiBlockUser(user!.uid, targetId);
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
