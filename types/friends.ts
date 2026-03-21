// types/friends.ts

export interface UserFriend {
    userId: string;
    username: string;
    addedAt: string;
    isOnline?: boolean;
    lastSeen?: string;
    avatar?: string;
}

export interface FriendRequest {
    requestId: string;
    fromUserId: string;
    fromUsername: string;
    toUserId: string;
    toUsername?: string;
    status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
    createdAt: string;
}

export interface UserProfile {
    userId: string;
    username: string;
    email: string;
    avatar?: string;
    isOnline: boolean;
    lastSeen: string;
    createdAt: string;

    // Listas
    friends?: Record<string, UserFriend>; // friendId -> UserFriend
    blockedUsers?: Record<string, BlockedUser>; // blockedId -> BlockedUser

    // Stats
    stats: {
        totalWins: number;
        totalLosses: number;
        winsVsBot: number;
        winsVsPlayers: number;
    };
}

export interface BlockedUser {
    userId: string;
    blockedAt: string;
}
