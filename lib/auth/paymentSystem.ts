// lib/auth/paymentSystem.ts

import { UserRole, UserProfile } from './roleSystem';

// Pagar UNA VEZ = Sin Anuncios Forever

/**
 * Procesa una compra y marca al usuario como PAYING si fue exitoso (Simplified).
 * Al ser la primera compra, marcará al usuario como PAYING permanentemente.
 */
export async function processPurchase(
    user: UserProfile,
    amount: number,
    itemType: string
): Promise<{ success: boolean; message: string; updatedUser?: UserProfile }> {

    // En producción, aquí se llamaría a Stripe o PayPal.
    // Para propósitos de este TCG local, simulamos una transacción exitosa si se completa:

    const paymentSuccessful = true; // Simulación

    if (paymentSuccessful) {
        const isFirstTime = !user.isPaying;
        const now = Date.now();

        const updatedUser = {
            ...user,
            isPaying: true,
            role: isFirstTime ? UserRole.PAYING : user.role, // Si es el primer pago, promocionamos de FREE
            firstPaymentDate: isFirstTime ? now : user.firstPaymentDate,
            totalSpent: user.totalSpent + amount,
        };

        return {
            success: true,
            message: isFirstTime ? '¡Gracias por tu apoyo! Anuncios deshabilitados permanentemente.' : 'Compra exitosa.',
            updatedUser
        };
    }

    return { success: false, message: 'Pago fallido. Inténtalo de nuevo.' };
}

/**
 * Valida si un producto en la tienda es elegible para marcar al usuario como PAYING.
 */
export function isValidFirstPurchase(itemId: string): boolean {
    // En producción, se verificaría contra el catálogo de la tienda.
    const paidItems = [
        'premium_gold_pack',
        'starter_pack',
        'remove_ads_forever',
        'cosmetic_sleeve_pack'
    ];
    return paidItems.includes(itemId);
}
