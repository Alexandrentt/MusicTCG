// lib/security/auditLog.ts

export interface AuditLog {
    id: string;
    userId: string;
    action: string;

    // Detalles
    endpoint: string;
    method: string;
    ipAddress: string;
    userAgent: string;

    // Contexto
    details: Record<string, any>;

    // Resultado
    success: boolean;
    errorReason?: string;

    // Timing
    timestamp: number;
}

/**
 * Registra un evento de seguridad de forma local (mock/localstorage para esta demo/ejercicio).
 */
export async function logSecurityEvent(
    userId: string,
    action: string,
    details: Record<string, any>
): Promise<void> {
    const auditLog: AuditLog = {
        id: `audit_${Date.now()}_${Math.random()}`,
        userId,
        action,
        endpoint: 'client-side',
        method: 'NA',
        ipAddress: 'local-ip', // En server sería req.socket.remoteAddress
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
        details,
        success: !action.includes('FAILED'),
        timestamp: Date.now(),
    };

    // En producción se guardaría en una base de datos de seguridad dedicada.
    console.info(`[SECURITY AUDIT] ${action} for ${userId}`, details);

    const existingLogs = JSON.parse(localStorage.getItem('musictcg-audit-logs') || '[]');
    existingLogs.unshift(auditLog);
    localStorage.setItem('musictcg-audit-logs', JSON.stringify(existingLogs.slice(0, 100)));
}

/**
 * Detecta actividad sospechosa basándose en keywords.
 */
export function isSuspiciousActivity(action: string): boolean {
    const suspicious = [
        'JWT_MISMATCH',
        'PAYMENT_VERIFICATION_FAILED',
        'MULTIPLE_FAILED_AUTH',
        'ACCELERATE_WITHOUT_PAYMENT',
        'ROLE_ELEVATION',
    ];
    return suspicious.includes(action);
}
