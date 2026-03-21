import { supabase } from '../supabase';
import { UserFriend, FriendRequest, BlockedUser } from '../../types/friends';

export async function findUserByUsername(username: string) {
    const { data, error } = await supabase
        .from('profiles')
        .select('id, username')
        .eq('username', username)
        .single();
    
    if (error || !data) return null;
    return { userId: data.id, username: data.username };
}

export async function sendFriendRequest(fromUser: { userId: string, username: string }, toUserId: string) {
    const { data, error } = await supabase
        .from('friend_requests')
        .insert({
            from_user_id: fromUser.userId,
            from_username: fromUser.username,
            to_user_id: toUserId,
            status: 'PENDING'
        })
        .select()
        .single();
        
    if (error) throw error;
    return data.id;
}

export async function acceptFriendRequest(toUserId: string, requestId: string, fromUserId: string, fromUsername: string, toUsername: string) {
    // Add to friends table for both users
    const { error: err1 } = await supabase
        .from('friends')
        .insert([
            { user_id: toUserId, friend_id: fromUserId, friend_username: fromUsername },
            { user_id: fromUserId, friend_id: toUserId, friend_username: toUsername }
        ]);
        
    if (err1) throw err1;

    // Delete request
    const { error: err2 } = await supabase
        .from('friend_requests')
        .delete()
        .eq('id', requestId);
        
    if (err2) throw err2;
}

export async function rejectFriendRequest(toUserId: string, requestId: string) {
    const { error } = await supabase
        .from('friend_requests')
        .delete()
        .eq('id', requestId);
        
    if (error) throw error;
}

export async function removeFriend(userId: string, friendId: string) {
    const { error } = await supabase
        .from('friends')
        .delete()
        .or(`and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`);
        
    if (error) throw error;
}

export async function blockUser(userId: string, targetId: string) {
    const { error } = await supabase
        .from('blocked_users')
        .insert({ user_id: userId, blocked_user_id: targetId });
        
    if (error) throw error;
}

export function watchFriendsStatus(userId: string, callback: (friends: Record<string, UserFriend>) => void) {
    // Initial fetch
    supabase
        .from('friends')
        .select('*')
        .eq('user_id', userId)
        .then(({ data }) => {
            if (data) {
                const friendsMap: Record<string, UserFriend> = {};
                data.forEach(f => {
                    friendsMap[f.friend_id] = { userId: f.friend_id, username: f.friend_username, addedAt: f.created_at };
                });
                callback(friendsMap);
            }
        });

    // Realtime subscription
    const channel = supabase.channel(`friends_${userId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'friends', filter: `user_id=eq.${userId}` }, payload => {
            // Re-fetch on change
            supabase
                .from('friends')
                .select('*')
                .eq('user_id', userId)
                .then(({ data }) => {
                    if (data) {
                        const friendsMap: Record<string, UserFriend> = {};
                        data.forEach(f => {
                            friendsMap[f.friend_id] = { userId: f.friend_id, username: f.friend_username, addedAt: f.created_at };
                        });
                        callback(friendsMap);
                    }
                });
        })
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
}

export async function updateUserPresence(userId: string, isOnline: boolean) {
    // Supabase presence or just update profile
    await supabase
        .from('profiles')
        .update({ is_online: isOnline, last_seen: new Date().toISOString() })
        .eq('id', userId);
}
