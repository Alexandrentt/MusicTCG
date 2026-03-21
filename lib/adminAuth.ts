// Admin authentication utilities

export const ADMIN_SESSION_KEY = 'musictcg_admin_session';

export function isAdminAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;
    const session = sessionStorage.getItem(ADMIN_SESSION_KEY);
    if (!session) return false;
    try {
        const parsed = JSON.parse(session);
        // Expira después de 2 horas
        if (Date.now() - parsed.timestamp > 2 * 60 * 60 * 1000) {
            sessionStorage.removeItem(ADMIN_SESSION_KEY);
            return false;
        }
        return parsed.authenticated === true;
    } catch {
        return false;
    }
}
