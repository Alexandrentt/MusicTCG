// lib/auth/roleSystem.ts

export enum UserRole {
    ADMIN = 'ADMIN',              // Control total
    PAYING = 'PAYING',            // Usuario que pagó
    FREE = 'FREE',                // Usuario común
    MODERATOR = 'MODERATOR',      // Moderador
}

export interface UserProfile {
    id: string;
    username: string;
    email: string;
    role: UserRole;
    isPaying: boolean;
    firstPaymentDate?: number;
    totalSpent: number;
    canSeeAds: boolean;
    joinedAt: number;
    verifiedEmail: boolean;
}

// El ÚNICO usuario maestro según la solicitud del USER
const MASTER_ADMIN_EMAIL = 'dretty156@gmail.com';

/**
 * Verifica si un email es el del administrador maestro.
 */
export function isMasterAdmin(email: string | null | undefined): boolean {
    return email?.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase();
}

/**
 * Verifica si un usuario (perfil o email) tiene permisos administrativos.
 * Solo dretty156@gmail.com puede realizar acciones críticas como borrar la colección global.
 */
export function canPerformAdminAction(user: { email?: string; role?: UserRole }): boolean {
    return isMasterAdmin(user.email) || user.role === UserRole.ADMIN;
}

/**
 * Ads are only shown for Free users.
 */
export function shouldShowAds(user: UserProfile): boolean {
    if (canPerformAdminAction(user) || user.isPaying) {
        return false;
    }
    return user.role === UserRole.FREE && !user.isPaying;
}

/**
 * Checks for specific role requirements.
 */
export function hasRequiredRole(user: UserProfile, requiredRole: UserRole | UserRole[]): boolean {
    const rolesArray = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    return rolesArray.includes(user.role) || isMasterAdmin(user.email);
}

