// lib/auth/roleSystem.ts

export enum UserRole {
    ADMIN = 'ADMIN',              // Tú - control total
    PAYING = 'PAYING',            // Pagó dinero real (incluye acceso sin anuncios)
    FREE = 'FREE',                // No pagó
    MODERATOR = 'MODERATOR',      // Futuro: mods comunitarios
}

export interface UserProfile {
    id: string;
    username: string;
    email: string;

    // ROLES
    role: UserRole;
    isPaying: boolean;           // ✅ Pago UNA VEZ = true FOREVER
    firstPaymentDate?: number;
    totalSpent: number;

    // COSMÉTICA
    canSeeAds: boolean;          // ← Derivado: !isPaying

    // SEGURIDAD
    joinedAt: number;
    verifiedEmail: boolean;
}

/**
 * Checks if a user has permission to view an ad at this moment.
 * Ads are only shown for Free users.
 */
export function shouldShowAds(user: UserProfile): boolean {
    if (user.role === UserRole.ADMIN || user.isPaying) {
        return false;
    }
    return user.role === UserRole.FREE && !user.isPaying;
}

/**
 * Checks for specific role requirements.
 */
export function hasRequiredRole(user: UserProfile, requiredRole: UserRole | UserRole[]): boolean {
    const rolesArray = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    return rolesArray.includes(user.role);
}
