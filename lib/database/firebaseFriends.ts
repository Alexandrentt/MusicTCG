// lib/database/firebaseFriends.ts
import { ref, set, onValue, update, push, get, child, remove, off, query, orderByChild, equalTo } from 'firebase/database';
import { rtdb } from '../firebase';
import { UserFriend, FriendRequest, UserProfile, BlockedUser } from '../../types/friends';

/**
 * Gestiona el sistema de amigos en RTDB
 */

/**
 * Enviar solicitud de amistad
 */
export async function sendFriendRequest(fromUser: { userId: string, username: string }, toUserId: string) {
    const requestId = push(child(ref(rtdb), `friend_requests/${toUserId}`)).key!;
    const request: FriendRequest = {
        requestId,
        fromUserId: fromUser.userId,
        fromUsername: fromUser.username,
        toUserId,
        status: 'PENDING',
        createdAt: new Date().toISOString()
    };

    await set(ref(rtdb, `friend_requests/${toUserId}/${requestId}`), request);
    return requestId;
}

/**
 * Aceptar solicitud
 */
export async function acceptFriendRequest(toUserId: string, requestId: string, fromUserId: string, fromUsername: string, toUsername: string) {
    const updates: any = {};

    // 1. Agregar a listas de cada uno
    const now = new Date().toISOString();

    // Friend for toUser (Aceptador)
    const friendForTo: UserFriend = { userId: fromUserId, username: fromUsername, addedAt: now };
    updates[`users/${toUserId}/friends/${fromUserId}`] = friendForTo;

    // Friend for fromUser (Solicitante)
    const friendForFrom: UserFriend = { userId: toUserId, username: toUsername, addedAt: now };
    updates[`users/${fromUserId}/friends/${toUserId}`] = friendForFrom;

    // 2. Marcar solicitud como aceptada (o borrarla)
    updates[`friend_requests/${toUserId}/${requestId}`] = null;

    await update(ref(rtdb), updates);
}

/**
 * Rechazar solicitud
 */
export async function rejectFriendRequest(toUserId: string, requestId: string) {
    await set(ref(rtdb, `friend_requests/${toUserId}/${requestId}`), null);
}

/**
 * Eliminar amigo
 */
export async function removeFriend(userId: string, friendId: string) {
    const updates: any = {};
    updates[`users/${userId}/friends/${friendId}`] = null;
    updates[`users/${friendId}/friends/${userId}`] = null;
    await update(ref(rtdb), updates);
}

/**
 * Bloquear usuario
 */
export async function blockUser(userId: string, targetId: string) {
    const blocked: BlockedUser = { userId: targetId, blockedAt: new Date().toISOString() };
    await set(ref(rtdb, `users/${userId}/blockedUsers/${targetId}`), blocked);
}

/**
 * Escuchar estado online de amigos
 */
export function watchFriendsStatus(userId: string, callback: (friends: Record<string, UserFriend>) => void) {
    const friendsRef = ref(rtdb, `users/${userId}/friends`);
    onValue(friendsRef, (snapshot) => {
        callback(snapshot.val() || {});
    });
    return () => off(friendsRef);
}

/**
 * Actualizar presencia online
 */
export async function updateUserPresence(userId: string, isOnline: boolean) {
    const statusRef = ref(rtdb, `users/${userId}/isOnline`);
    const lastSeenRef = ref(rtdb, `users/${userId}/lastSeen`);

    await set(statusRef, isOnline);
    await set(lastSeenRef, new Date().toISOString());

    // TODO: Agregar desconexión automática con onDisconnect()
}

/**
 * Buscar usuario por username (Case-sensitive simple)
 */
export async function findUserByUsername(username: string): Promise<UserProfile | null> {
    const usersRef = query(ref(rtdb, 'users'), orderByChild('username'), equalTo(username));
    const snapshot = await get(usersRef);
    if (snapshot.exists()) {
        const data = snapshot.val();
        const userId = Object.keys(data)[0];
        return { userId, ...data[userId] };
    }
    return null;
}
