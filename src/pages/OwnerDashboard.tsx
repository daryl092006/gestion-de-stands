import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAppStore } from '../store/appStore';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
    Activity,
    Store,
    TrendingUp,
    Users,
    ArrowUpRight,
    Coins,
    RefreshCw,
    Loader2,
    ChevronRight,
    Search,
    Filter,
    Smartphone,
    Shield,
    ShieldCheck,
    Lock,
    CheckCircle
} from 'lucide-react';

export const OwnerDashboard: React.FC = () => {
    const { user } = useAppStore();
    const [stats, setStats] = useState({
        totalCash: 0,
        totalElectro: 0,
        activeStands: 0,
        totalStands: 0,
        completedTransactions: 0
    });
    const [standsSessions, setStandsSessions] = useState<any[]>([]);
    const [agents, setAgents] = useState<any[]>([]);
    const [recentClosed, setRecentClosed] = useState<any[]>([]);
    const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const navigate = useNavigate();

    const loadData = useCallback(async () => {
        if (!user?.id) return;
        setRefreshing(true);
        try {
            // 1. Charger tous les stands du proprio
            const allStands = await api.stands.getByOwner(user.id);
            // 2. Charger toutes les sessions actives (Ouverte ou Pre-ouverte)
            const activeSessions = await api.sessions.getActiveForOwner(user.id);

            // 3. Charger les transactions pour CHAQUE session active
            const txBySession: Record<number, any[]> = {};
            await Promise.all(
                activeSessions.map(async (s: any) => {
                    try {
                        const txs = await api.transactions.getBySession(s.id);
                        txBySession[s.id] = txs || [];
                    } catch { txBySession[s.id] = []; }
                })
            );

            // 4. Fusionner les données + calculer les soldes actuels
            const dashboardData = allStands.map((stand: any) => {
                const session = activeSessions.find((s: any) => s.id_stand === stand.id);
                const txs = session ? (txBySession[session.id] || []) : [];

                // Soldes en temps réel
                const initCash = session?.solde_initial_cash_agent ?? session?.solde_initial_cash_proprio ?? 0;
                const totalDep = txs.filter(tx => tx.type === 'Dépôt').reduce((s: number, tx: any) => s + tx.montant, 0);
                const totalRet = txs.filter(tx => tx.type === 'Retrait').reduce((s: number, tx: any) => s + tx.montant, 0);
                const cashActuel = initCash + totalDep - totalRet;

                // E-Money par opérateur
                const emoneyActuel: Record<number, number> = {};
                session?.journee_operateur?.forEach((ob: any) => {
                    const initE = ob.solde_initial_electro_agent ?? ob.solde_initial_electro_proprio ?? 0;
                    const depOp = txs.filter(tx => tx.type === 'Dépôt' && tx.id_operateur === ob.id_operateur).reduce((s: number, tx: any) => s + tx.montant, 0);
                    const retOp = txs.filter(tx => tx.type === 'Retrait' && tx.id_operateur === ob.id_operateur).reduce((s: number, tx: any) => s + tx.montant, 0);
                    emoneyActuel[ob.id_operateur] = initE - depOp + retOp;
                });

                return {
                    ...stand,
                    session: session || null,
                    isOpen: session?.statut === 'Ouverte',
                    isPreOpen: session?.statut === 'Pre-ouverte',
                    transactions: txs,
                    cashActuel,
                    initCash,
                    totalDep,
                    totalRet,
                    emoneyActuel
                };
            });

            // 5. KPIs globaux (basés sur soldes actuels)
            let cash = 0;
            let electro = 0;
            let transactionsCount = 0;
            let activeCount = 0;

            dashboardData.forEach((item: any) => {
                if (item.isOpen) {
                    activeCount++;
                    cash += item.cashActuel || 0;
                    item.session?.journee_operateur?.forEach((jo: any) => {
                        electro += item.emoneyActuel[jo.id_operateur] ?? 0;
                    });
                    transactionsCount += item.transactions.length;
                }
            });

            // 6. Charger les agents
            const { data: agentsList } = await supabase.from('profiles').select('*').eq('role', 'Agent');
            setAgents(agentsList || []);

            // 7. Clôtures récentes
            const closedList = await api.sessions.getRecentClosedForOwner(user.id);
            setRecentClosed(closedList || []);

            // 8. Transactions récentes
            const txList = await api.sessions.getRecentTransactionsForOwner(user.id, 25);
            setRecentTransactions(txList);

            setStandsSessions(dashboardData);
            setStats({
                totalCash: cash,
                totalElectro: electro,
                activeStands: activeCount,
                totalStands: allStands.length,
                completedTransactions: transactionsCount
            });
            setLastUpdated(new Date());
        } catch (err) {
            console.error('Error loading dashboard data:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user?.id]);

    const handleReactivate = async (agentId: string) => {
        if (!window.confirm("Voulez-vous vraiment réactiver cet agent ? Assurez-vous d'avoir réglé le motif de la suspension.")) return;
        try {
            await api.profiles.reactivate(agentId);
            loadData();
        } catch (err) {
            alert("Erreur lors de la réactivation");
        }
    };

    useEffect(() => {
        loadData();
    }, [loadData]);

    // ── Polling toutes les 15 secondes (réduit de 30s) ──
    useEffect(() => {
        if (!user?.id) return;
        pollingRef.current = setInterval(() => {
            loadData();
        }, 15000);
        return () => {
            if (pollingRef.current) clearInterval(pollingRef.current);
        };
    }, [loadData, user?.id]);

    // ── Supabase Realtime : écouter les nouvelles transactions ──
    useEffect(() => {
        if (!user?.id) return;
        const channel = supabase
            .channel('owner-dashboard-realtime')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'transaction' },
                (_payload) => {
                    // Une nouvelle transaction a été enregistrée → rafraîchir
                    loadData();
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'journee' },
                (_payload) => {
                    // Statut d'une journée a changé (ouverture, clôture) → rafraîchir
                    loadData();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user?.id, loadData]);

    if (loading) {
        return (
            <div className="flex-center" style={{ minHeight: '400px', flexDirection: 'column', gap: '16px' }}>
                <Loader2 size={40} className="animate-spin" color="var(--primary)" />
                <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Initialisation du centre de contrôle...</p>
            </div>
        );
    }

    if (stats.totalStands === 0) {
        navigate('/onboarding');
        return null;
    }

    return (
        <div className="animate-fade-in" style={{ paddingBottom: '100px' }}>
            {/* Header Section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', gap: '20px', flexWrap: 'wrap' }}>
                <div>
                    <h1 style={{ fontSize: '32px', fontWeight: 900, color: '#0f172a', letterSpacing: '-1px', marginBottom: '8px' }}>
                        Dashboard Propriétaire
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '16px', fontWeight: 500 }}>
                        Vue d'ensemble de vos {stats.totalStands} points de vente.
                    </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                    <button
                        onClick={loadData}
                        className="btn-secondary"
                        disabled={refreshing}
                        style={{ borderRadius: '16px', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '10px' }}
                    >
                        <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
                        {refreshing ? 'Mise à jour...' : 'Actualiser'}
                    </button>
                    {lastUpdated && (
                        <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>
                            🔄 Mis à jour : {lastUpdated.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                    )}
                </div>
            </div>

            {/* Global Stats Cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '24px',
                marginBottom: '48px'
            }}>
                <div className="glass-card" style={{ padding: '32px', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', right: '-10px', top: '-10px', opacity: 0.05 }}>
                        <Coins size={120} />
                    </div>
                    <p style={{ color: '#64748b', fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '1px' }}>Total Cash (Live)</p>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                        <h2 style={{ fontSize: '36px', fontWeight: 900, color: '#0f172a' }}>{stats.totalCash.toLocaleString()}</h2>
                        <span style={{ fontSize: '16px', color: '#94a3b8', fontWeight: 700 }}>FCFA</span>
                    </div>
                    <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981' }}>
                        <ArrowUpRight size={16} />
                        <span style={{ fontSize: '13px', fontWeight: 700 }}>En caisse physique</span>
                    </div>
                </div>

                <div className="glass-card" style={{ padding: '32px', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', right: '-10px', top: '-10px', opacity: 0.05 }}>
                        <Smartphone size={120} />
                    </div>
                    <p style={{ color: '#64748b', fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '1px' }}>Stock E-Money (Live)</p>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                        <h2 style={{ fontSize: '36px', fontWeight: 900, color: 'var(--primary)' }}>{stats.totalElectro.toLocaleString()}</h2>
                        <span style={{ fontSize: '16px', color: '#94a3b8', fontWeight: 700 }}>FCFA</span>
                    </div>
                    <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)' }}>
                        <Activity size={16} />
                        <span style={{ fontSize: '13px', fontWeight: 700 }}>Total Float cumulé</span>
                    </div>
                </div>

                <div className="glass-card" style={{ padding: '32px', background: 'var(--primary)', color: 'white' }}>
                    <p style={{ opacity: 0.8, fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '1px' }}>Activité Réseau</p>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                        <h2 style={{ fontSize: '36px', fontWeight: 900 }}>{stats.activeStands} <span style={{ fontSize: '20px', opacity: 0.7 }}>/ {stats.totalStands}</span></h2>
                    </div>
                    <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 10px #4ade80' }}></div>
                        <span style={{ fontSize: '13px', fontWeight: 700 }}>Stands actuellement ouverts</span>
                    </div>
                </div>
            </div>

            {/* Stands Grid Section */}
            <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#1e293b' }}>État des Points de Vente</h3>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        <input
                            type="text"
                            placeholder="Rechercher un stand..."
                            style={{
                                height: '40px',
                                paddingLeft: '36px',
                                border: '1px solid #e2e8f0',
                                borderRadius: '12px',
                                fontSize: '14px',
                                width: '240px'
                            }}
                        />
                    </div>
                    <button className="btn-secondary" style={{ padding: '0 12px', borderRadius: '12px' }}>
                        <Filter size={18} />
                    </button>
                </div>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '24px'
            }}>
                {standsSessions.map((item) => (
                    <div key={item.id} className="glass-card animate-scale-in" style={{ padding: '24px', borderTop: `4px solid ${item.isOpen ? '#10b981' : item.isPreOpen ? '#f59e0b' : '#cbd5e1'}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '20px' }}>
                            <div>
                                <h4 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>{item.nom}</h4>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{
                                        width: '8px',
                                        height: '8px',
                                        borderRadius: '50%',
                                        background: item.isOpen ? '#10b981' : item.isPreOpen ? '#f59e0b' : '#cbd5e1'
                                    }} />
                                    <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                                        {item.isOpen ? 'En service' : item.isPreOpen ? 'Pre-ouvert' : 'Fermé'}
                                    </span>
                                </div>
                            </div>
                            <div style={{
                                width: '40px',
                                height: '40px',
                                background: '#f8fafc',
                                borderRadius: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--primary)'
                            }}>
                                <Store size={20} />
                            </div>
                        </div>

                        {item.session ? (
                            <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '14px', marginBottom: '16px' }}>

                                {/* Cash actuel */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                    <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>💵 Cash actuel</span>
                                    <div style={{ textAlign: 'right' }}>
                                        <span style={{ fontSize: '15px', fontWeight: 900, color: (item.cashActuel ?? 0) >= (item.initCash ?? 0) ? '#10b981' : '#ef4444' }}>
                                            {(item.cashActuel ?? item.initCash ?? 0).toLocaleString()} F
                                        </span>
                                        {item.totalDep + item.totalRet > 0 && (
                                            <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block' }}>
                                                Init : {(item.initCash ?? 0).toLocaleString()} F
                                                {' '}<span style={{ color: (item.cashActuel - item.initCash) >= 0 ? '#10b981' : '#ef4444', fontWeight: 700 }}>
                                                    ({(item.cashActuel - item.initCash) >= 0 ? '+' : ''}{(item.cashActuel - item.initCash).toLocaleString()} F)
                                                </span>
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* E-Money par opérateur */}
                                {item.session.journee_operateur?.map((jo: any) => {
                                    const opName = jo.nom_operateur || jo.operateur?.nom || `Op.${jo.id_operateur}`;
                                    const soldeE = item.emoneyActuel?.[jo.id_operateur];
                                    const initE = jo.solde_initial_electro_agent ?? jo.solde_initial_electro_proprio ?? 0;
                                    const diffE = (soldeE ?? initE) - initE;
                                    return (
                                        <div key={jo.id_operateur} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>📱 {opName}</span>
                                            <div style={{ textAlign: 'right' }}>
                                                <span style={{ fontSize: '14px', fontWeight: 800, color: diffE >= 0 ? 'var(--primary)' : '#ef4444' }}>
                                                    {(soldeE ?? initE).toLocaleString()} F
                                                </span>
                                                {diffE !== 0 && (
                                                    <span style={{ fontSize: '10px', display: 'block', color: diffE > 0 ? 'var(--primary)' : '#ef4444', fontWeight: 700 }}>
                                                        {diffE > 0 ? '+' : ''}{diffE.toLocaleString()} F
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Nb transactions */}
                                {item.isOpen && (
                                    <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>Opérations aujourd'hui</span>
                                        <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--primary)' }}>{item.transactions?.length || 0}</span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div style={{ height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', border: '1px dashed #cbd5e1', borderRadius: '16px' }}>
                                <p style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>Aucune session aujourd'hui</p>
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Users size={14} color="#64748b" />
                                </div>
                                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
                                    {agents.length > 0 ? `${agents.length} Agent(s)` : 'Aucun agent'}
                                </span>
                            </div>
                            <button
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--primary)',
                                    fontWeight: 800,
                                    fontSize: '13px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    cursor: 'pointer'
                                }}
                            >
                                Détails <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                ))}

                <div style={{
                    border: '2px dashed #e2e8f0',
                    borderRadius: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '40px',
                    gap: '16px',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    background: 'transparent'
                }} className="hover-scale">
                    <div style={{ width: '48px', height: '48px', background: '#f1f5f9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <TrendingUp size={24} color="#64748b" />
                    </div>
                    <p style={{ fontSize: '14px', fontWeight: 700, color: '#64748b' }}>Ajouter un point de vente</p>
                </div>
            </div>

            {/* Live Transactions Section */}
            <div style={{ marginTop: '48px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981', animation: 'pulse 2s infinite' }} />
                        <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#1e293b' }}>Transactions en Direct — Aujourd'hui</h3>
                    </div>
                    <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 600 }}>{recentTransactions.length} opération(s)</span>
                </div>

                <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                    {recentTransactions.length === 0 ? (
                        <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                            Aucune transaction enregistrée aujourd'hui.
                        </div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: '#f8fafc' }}>
                                    <th style={{ padding: '14px 20px', fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', textAlign: 'left' }}>Stand</th>
                                    <th style={{ padding: '14px 20px', fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', textAlign: 'left' }}>Type</th>
                                    <th style={{ padding: '14px 20px', fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', textAlign: 'left' }}>Opérateur</th>
                                    <th style={{ padding: '14px 20px', fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', textAlign: 'right' }}>Montant</th>
                                    <th style={{ padding: '14px 20px', fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', textAlign: 'right' }}>Heure</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentTransactions.map((tx: any) => {
                                    const isDepot = tx.type === 'Dépôt';
                                    return (
                                        <tr key={tx.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                                            <td style={{ padding: '14px 20px' }}>
                                                <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>
                                                    {tx.journee?.stand?.nom || '—'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '14px 20px' }}>
                                                <span style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                                                    padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 800,
                                                    background: isDepot ? '#ecfdf5' : '#fef2f2',
                                                    color: isDepot ? '#10b981' : '#ef4444'
                                                }}>
                                                    {isDepot ? '↑' : '↓'} {tx.type}
                                                </span>
                                            </td>
                                            <td style={{ padding: '14px 20px', fontSize: '13px', color: '#64748b' }}>
                                                {tx.operateur?.nom || '—'}
                                            </td>
                                            <td style={{ padding: '14px 20px', textAlign: 'right', fontSize: '15px', fontWeight: 800, color: isDepot ? '#10b981' : '#ef4444' }}>
                                                {isDepot ? '+' : '-'}{tx.montant?.toLocaleString()} F
                                            </td>
                                            <td style={{ padding: '14px 20px', textAlign: 'right', fontSize: '12px', color: '#94a3b8' }}>
                                                {new Date(tx.date_heure).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Recent Closings Section */}
            <div style={{ marginTop: '48px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                    <CheckCircle size={24} color="#10b981" />
                    <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#1e293b' }}>Bilans de Clôture Récents</h3>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '20px' }}>
                    {recentClosed.map(session => (
                        <div key={session.id} className="glass-card" style={{ padding: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                                <p style={{ fontWeight: 800, color: '#0f172a' }}>{session.stand?.nom}</p>
                                <span style={{ fontSize: '12px', color: '#64748b' }}>{new Date(session.date_jour + 'T00:00:00').toLocaleDateString('fr-FR')}</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px' }}>
                                    <p style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>CASH FINAL</p>
                                    <p style={{ fontSize: '16px', fontWeight: 800 }}>{(session.solde_final_cash_agent || 0).toLocaleString()} F</p>
                                </div>
                                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px' }}>
                                    <p style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>STATUT</p>
                                    <p style={{ fontSize: '14px', fontWeight: 800, color: '#10b981' }}>CLÔTURÉ ✓</p>
                                </div>
                            </div>
                        </div>
                    ))}
                    {recentClosed.length === 0 && (
                        <div style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic', background: '#f8fafc', borderRadius: '24px' }}>
                            Aucun bilan de clôture enregistré récemment.
                        </div>
                    )}
                </div>
            </div>

            {/* Agent Security Management Section */}
            <div style={{ marginTop: '48px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Shield size={24} color="#ef4444" />
                        <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#1e293b' }}>Sécurité & Agents</h3>
                    </div>
                    <button 
                        onClick={() => navigate('/config')} 
                        className="btn-primary" 
                        style={{ padding: '8px 20px', fontSize: '14px' }}
                    >
                        + Ajouter un Agent
                    </button>
                </div>

                <div className="glass-card" style={{ padding: 0 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                                <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Agent</th>
                                <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Statut</th>
                                <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Téléphone</th>
                                <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {agents.map(agent => (
                                <tr key={agent.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '16px 24px' }}>
                                        <p style={{ fontWeight: 700, color: '#0f172a' }}>{agent.prenom} {agent.nom}</p>
                                        <p style={{ fontSize: '12px', color: '#64748b' }}>{agent.login}</p>
                                    </td>
                                    <td style={{ padding: '16px 24px' }}>
                                        {agent.is_suspended ? (
                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', background: '#fee2e2', color: '#ef4444', borderRadius: '20px', fontSize: '11px', fontWeight: 800 }}>
                                                <Lock size={12} /> SUSPENDU
                                            </div>
                                        ) : (
                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', background: '#ecfdf5', color: '#10b981', borderRadius: '20px', fontSize: '11px', fontWeight: 800 }}>
                                                <ShieldCheck size={12} /> ACTIF
                                            </div>
                                        )}
                                    </td>
                                    <td style={{ padding: '16px 24px', fontSize: '14px', color: '#64748b' }}>
                                        {agent.telephone || '—'}
                                    </td>
                                    <td style={{ padding: '16px 24px', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                        <button
                                            onClick={async () => {
                                                const newPass = prompt(`Nouveau mot de passe pour ${agent.prenom} ${agent.nom} :`);
                                                if (newPass && newPass.length >= 6) {
                                                    try {
                                                        await api.auth.resetAgentPassword(agent.id, newPass);
                                                        alert("Mot de passe mis à jour avec succès. L'agent devra le changer à sa prochaine connexion.");
                                                    } catch (err) {
                                                        alert("Erreur lors de la mise à jour : " + (err as any).message);
                                                    }
                                                } else if (newPass) {
                                                    alert("Le mot de passe doit faire au moins 6 caractères.");
                                                }
                                            }}
                                            className="btn-secondary"
                                            style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                                            title="Réinitialiser le mot de passe"
                                        >
                                            <Lock size={14} />
                                            Reset
                                        </button>
                                        {agent.is_suspended && (
                                            <button
                                                onClick={() => handleReactivate(agent.id)}
                                                className="btn-primary"
                                                style={{ padding: '6px 16px', fontSize: '12px', background: '#10b981', borderColor: '#10b981' }}
                                            >
                                                Réactiver
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {agents.length === 0 && (
                                <tr>
                                    <td colSpan={4} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                                        Aucun agent enregistré pour le moment.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
