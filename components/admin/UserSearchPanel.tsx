// components/admin/UserSearchPanel.tsx

'use client';

import { useState } from 'react';
import { usePlayerStore } from '@/store/usePlayerStore';
import { UserRole } from '@/lib/auth/roleSystem';
import { Search, ShieldAlert, CheckCircle, XCircle, AlertTriangle, User, Mail, DollarSign, Calendar, Zap } from 'lucide-react';
import { logSecurityEvent } from '@/lib/security/auditLog';

export default function UserSearchPanel() {
    const { isPaying, role, setPayingStatus, addPremiumGold } = usePlayerStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [reason, setReason] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    // Como estamos en un contexto local sin DB de usuarios, simularemos al usuario actual como el result de la búsqueda
    const mockUserResult = {
        id: 'local-user-uuid',
        username: 'Current Player',
        email: 'player@musictcg.local',
        isPaying,
        role,
        totalSpent: 19.99,
        firstPaymentDate: Date.now() - (1000 * 60 * 60 * 24 * 30), // 30 días
    };

    const handleTogglePaying = async () => {
        if (!reason.trim()) {
            alert('Ingresa una razón administrativa para este cambio.');
            return;
        }

        setActionLoading(true);

        // Simulating API call delay
        setTimeout(async () => {
            const newStatus = !isPaying;

            // Zustand Store Update
            setPayingStatus(newStatus);

            // Security LOG
            await logSecurityEvent('ADMIN_UUID', 'ADMIN_PAYMENT_STATUS_CHANGED', {
                targetUserId: mockUserResult.id,
                oldStatus: isPaying,
                newStatus,
                reason
            });

            setActionLoading(false);
            setReason('');
            alert(`Estado de pago actualizado para ${mockUserResult.username} -> ${newStatus ? 'PAYING' : 'FREE'}`);
        }, 1000);
    };

    const handleGrantPremium = () => {
        addPremiumGold(100);
        alert('Otorgado 100 Oro Premium por compensación administrativa.');
    };

    return (
        <div className="w-full space-y-8 p-8 bg-[#0a0a0a] border border-white/5 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                <Search className="w-64 h-64 text-white" />
            </div>

            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-8">
                    <div className="bg-red-500/10 p-2.5 rounded-xl border border-red-500/20">
                        <ShieldAlert className="w-6 h-6 text-red-500" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black uppercase tracking-tighter text-white">Administración de Usuarios</h2>
                        <p className="text-xs text-gray-500 uppercase font-black tracking-widest">Auditoría y Gestión de Roles</p>
                    </div>
                </div>

                {/* Search Bar Mock */}
                <div className="relative mb-10">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por ID, Email o Nombre de Usuario..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-500/40 transition-all font-medium"
                    />
                </div>

                {/* User Detail Panel */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Info Cards */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex items-start gap-6">
                            <div className="w-20 h-20 bg-gradient-to-br from-gray-700 to-black rounded-3xl border border-white/10 flex items-center justify-center">
                                <User className="w-8 h-8 text-gray-400" />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <h3 className="text-lg font-black text-white">{mockUserResult.username}</h3>
                                    <span className={`px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${isPaying ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'}`}>
                                        {isPaying ? 'Paying User' : 'Free User'}
                                    </span>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-xs text-gray-500 font-bold uppercase tracking-tight">
                                        <Mail className="w-3.5 h-3.5" />
                                        {mockUserResult.email}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-gray-500 font-bold uppercase tracking-tight">
                                        <User className="w-3.5 h-3.5" />
                                        UUID: {mockUserResult.id}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                                <div className="flex items-center justify-between mb-2">
                                    <DollarSign className="w-4 h-4 text-green-400" />
                                    <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Inversión Total</span>
                                </div>
                                <div className="text-2xl font-black text-white">${mockUserResult.totalSpent.toFixed(2)}</div>
                                <p className="text-[10px] text-gray-600 font-medium uppercase mt-1 tracking-tighter">Verificado via Payment Gateway</p>
                            </div>
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                                <div className="flex items-center justify-between mb-2">
                                    <Calendar className="w-4 h-4 text-blue-400" />
                                    <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Antigüedad</span>
                                </div>
                                <div className="text-lg font-black text-white">{new Date(mockUserResult.firstPaymentDate).toLocaleDateString()}</div>
                                <p className="text-[10px] text-gray-600 font-medium uppercase mt-1 tracking-tighter">Primer pago registrado</p>
                            </div>
                        </div>
                    </div>

                    {/* Actions Panel */}
                    <div className="space-y-6">
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                            <h4 className="text-xs font-black uppercase text-gray-400 tracking-[0.2em] mb-4">Acciones Críticas</h4>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Razón del cambio:</label>
                                    <textarea
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        placeholder="Ej: Testing account, Refund request, Compensation..."
                                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-red-500/50 transition-all resize-none"
                                        rows={2}
                                    />
                                </div>

                                <button
                                    onClick={handleTogglePaying}
                                    disabled={actionLoading}
                                    className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-2 ${isPaying ? 'bg-red-600/10 hover:bg-red-600/20 text-red-500 border border-red-500/30' : 'bg-green-600/10 hover:bg-green-600/20 text-green-500 border border-green-500/30'}`}
                                >
                                    {actionLoading ? 'Procesando...' : isPaying ? <><XCircle className="w-4 h-4" /> Revocar Status</> : <><CheckCircle className="w-4 h-4" /> Otorgar Status</>}
                                </button>

                                <button
                                    onClick={handleGrantPremium}
                                    className="w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.15em] bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 transition-all flex items-center justify-center gap-2"
                                >
                                    <Zap className="w-4 h-4" /> Bonus Premium Gold
                                </button>
                            </div>

                            <div className="mt-6 flex items-start gap-2 bg-yellow-900/10 border border-yellow-800/20 p-3 rounded-xl">
                                <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0" />
                                <p className="text-[10px] text-yellow-200/60 font-medium leading-[1.3]">
                                    Todas las acciones están siendo registradas para auditoría interna. El uso inadecuado puede resultar en revocación de permisos admin.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
