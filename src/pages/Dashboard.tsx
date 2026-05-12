import React, { useEffect, useState, useCallback } from 'react';
import { useAppStore } from '../store/appStore';
import { api } from '../services/api';
import {
    ArrowUpRight,
    ArrowDownLeft,
    Smartphone,
    TrendingUp,
    Calendar,
    AlertCircle,
    Plus,
    ArrowRight,
    Store,
    Coins,
    RefreshCw,
    Loader2,
    ChevronDown
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const Dashboard: React.FC = () => {
    const { user, currentJournee, currentStand, setJournee, setCurrentStand, transactions, setTransactions } = useAppStore();

    // Sessions actives disponibles (pour le sélecteur si plusieurs stands)
    const [activeSessions, setActiveSessions] = useState<any[]>([]);
    const [standOperators, setStandOperators] = useState<any[]>([]);
    const [bootstrapping, setBootstrapping] = useState(true); // premier chargement
    const [loadingTx, setLoadingTx] = useState(false);
    const [showPicker, setShowPicker] = useState(false);

    // ──────────────────────────────────────────────────
    // 1. Au montage : récupérer toutes les sessions actives
    // ──────────────────────────────────────────────────
    const fetchActiveSessions = useCallback(async () => {
        if (!user?.id) return;
        try {
            let sessions: any[] = [];
            if (user.role === 'Proprietaire') {
                sessions = await api.sessions.getActiveForOwner(user.id);
            } else if (user.role === 'Agent') {
                sessions = await api.sessions.getActiveForAgent(user.id);
            }
            setActiveSessions(sessions);

            // Si aucun stand n'est encore sélectionné dans le store ET qu'on a des sessions,
            // on sélectionne automatiquement la première (ou l'unique)
            if (!currentJournee && sessions.length > 0) {
                const first = sessions[0];
                setJournee(first);
                setCurrentStand(first.stand);
            }
        } catch (err) {
            console.error('Dashboard: error fetching active sessions', err);
        } finally {
            setBootstrapping(false);
        }
    }, [user?.id, user?.role, currentJournee, setJournee, setCurrentStand]);

    useEffect(() => {
        fetchActiveSessions();
    }, [fetchActiveSessions]);

    // ──────────────────────────────────────────────────
    // 2. Charger les transactions & opérateurs quand la journée change
    // ──────────────────────────────────────────────────
    useEffect(() => {
        const fetchData = async () => {
            if (!currentJournee) return;
            setLoadingTx(true);
            try {
                const [txData, opsData] = await Promise.all([
                    api.transactions.getBySession(currentJournee.id),
                    api.stands.getOperators(currentJournee.id_stand)
                ]);
                setTransactions(txData as any);
                setStandOperators(opsData);
            } catch (err) {
                console.error('Dashboard: error fetching tx/ops', err);
            } finally {
                setLoadingTx(false);
            }
        };
        fetchData();
    }, [currentJournee?.id, setTransactions]);

    // ──────────────────────────────────────────────────
    // Calculs
    // ──────────────────────────────────────────────────
    const totalDepots = transactions.filter(tx => tx.type === 'Dépôt').reduce((s, tx) => s + tx.montant, 0);
    const totalRetraits = transactions.filter(tx => tx.type === 'Retrait').reduce((s, tx) => s + tx.montant, 0);
    const soldeNet = totalDepots - totalRetraits;

    // Changer de stand depuis le Dashboard (sans aller dans "Ma Journée")
    const handleSwitchSession = (session: any) => {
        setJournee(session);
        setCurrentStand(session.stand);
        setShowPicker(false);
    };

    // ──────────────────────────────────────────────────
    // VUE : chargement initial
    // ──────────────────────────────────────────────────
    if (bootstrapping) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: '16px' }}>
                <Loader2 size={40} color="var(--primary)" className="animate-spin" />
                <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Chargement des sessions en cours…</p>
            </div>
        );
    }

    // ──────────────────────────────────────────────────
    // VUE : aucune session active
    // ──────────────────────────────────────────────────
    if (!currentJournee) {
        return (
            <div className="animate-fade-in" style={{ textAlign: 'center', padding: '100px 20px' }}>
                <div style={{ width: '120px', height: '120px', background: 'white', borderRadius: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 32px', boxShadow: '0 20px 40px rgba(0,0,0,0.05)' }}>
                    <Calendar size={48} color="var(--primary)" />
                </div>
                <h2 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '16px', letterSpacing: '-1px' }}>
                    Aucune session active
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '18px', maxWidth: '500px', margin: '0 auto 40px' }}>
                    {user?.role === 'Agent'
                        ? 'Aucun stand ne vous a été affecté avec une session prête. Contactez votre propriétaire.'
                        : 'Ouvrez ou pré-ouvrez un stand pour activer le tableau de bord.'}
                </p>
                <Link to="/journee" className="btn-primary" style={{ textDecoration: 'none', padding: '16px 40px', fontSize: '16px', display: 'inline-flex', alignItems: 'center', gap: '12px' }}>
                    {user?.role === 'Agent' ? 'Prendre mon poste' : 'Gérer mes stands'} <ArrowRight size={20} />
                </Link>
            </div>
        );
    }

    // ──────────────────────────────────────────────────
    // VUE : Agent doit confirmer
    // ──────────────────────────────────────────────────
    if (currentJournee.statut === 'Pre-ouverte' && user?.role === 'Agent') {
        return (
            <div className="animate-fade-in" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', padding: '80px 20px' }}>
                <div style={{ width: '100px', height: '100px', background: '#fffbeb', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 32px' }}>
                    <AlertCircle size={48} color="#d97706" />
                </div>
                <h2 style={{ fontSize: '26px', fontWeight: 800, marginBottom: '12px' }}>Action requise</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '16px', marginBottom: '32px' }}>
                    Le stand <strong>{currentStand?.nom}</strong> a une session préparée par le propriétaire.
                    Confirmez vos balances pour activer le service.
                </p>
                <Link to="/journee" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '14px 32px' }}>
                    Confirmer et ouvrir <ArrowRight size={18} />
                </Link>
            </div>
        );
    }

    // ──────────────────────────────────────────────────
    // VUE : Dashboard complet
    // ──────────────────────────────────────────────────
    return (
        <div className="animate-fade-in">

            {/* ── En-tête avec sélecteur de stand ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '56px', height: '56px', background: 'var(--primary)', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Store size={28} color="white" />
                    </div>
                    <div>
                        <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>
                            {currentStand?.nom || 'Stand actif'}
                        </h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: currentJournee.statut === 'Ouverte' ? '#10b981' : '#f59e0b' }} />
                            <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>
                                {currentJournee.statut} — {new Date(currentJournee.date_jour + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </span>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Sélecteur de stands si plusieurs sessions actives */}
                    {activeSessions.length > 1 && (
                        <div style={{ position: 'relative' }}>
                            <button
                                className="btn-secondary"
                                onClick={() => setShowPicker(v => !v)}
                                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
                            >
                                <Store size={14} /> Changer de stand <ChevronDown size={14} />
                            </button>
                            {showPicker && (
                                <div style={{
                                    position: 'absolute', right: 0, top: 'calc(100% + 8px)', zIndex: 999,
                                    background: 'white', borderRadius: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.12)',
                                    border: '1px solid #e2e8f0', minWidth: '220px', overflow: 'hidden'
                                }}>
                                    {activeSessions.map(s => (
                                        <button
                                            key={s.id}
                                            onClick={() => handleSwitchSession(s)}
                                            style={{
                                                width: '100%', textAlign: 'left', padding: '14px 18px',
                                                background: s.id === currentJournee.id ? '#f8fafc' : 'white',
                                                border: 'none', cursor: 'pointer',
                                                borderBottom: '1px solid #f1f5f9', fontSize: '14px'
                                            }}
                                        >
                                            <p style={{ fontWeight: 700, color: '#1e293b' }}>{s.stand?.nom}</p>
                                            <p style={{ fontSize: '12px', color: s.statut === 'Ouverte' ? '#10b981' : '#f59e0b', fontWeight: 600 }}>{s.statut}</p>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                    <Link to="/journee" className="btn-secondary" style={{ textDecoration: 'none', fontSize: '13px' }}>
                        Gérer mes stands
                    </Link>
                </div>
            </div>

            {/* ── KPI Cards ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                <div className="glass-card" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
                        <p style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Dépôts</p>
                        <div style={{ width: '36px', height: '36px', background: '#ecfdf5', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <ArrowUpRight size={18} color="#10b981" />
                        </div>
                    </div>
                    <h3 style={{ fontSize: '26px', fontWeight: 900, color: '#10b981' }}>{totalDepots.toLocaleString()}</h3>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>FCFA encaissés</p>
                </div>

                <div className="glass-card" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
                        <p style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Retraits</p>
                        <div style={{ width: '36px', height: '36px', background: '#fef2f2', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <ArrowDownLeft size={18} color="#ef4444" />
                        </div>
                    </div>
                    <h3 style={{ fontSize: '26px', fontWeight: 900, color: '#ef4444' }}>{totalRetraits.toLocaleString()}</h3>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>FCFA décaissés</p>
                </div>

                <div className="glass-card" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
                        <p style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Solde Net</p>
                        <div style={{ width: '36px', height: '36px', background: 'rgba(79,70,229,0.08)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <TrendingUp size={18} color="var(--primary)" />
                        </div>
                    </div>
                    <h3 style={{ fontSize: '26px', fontWeight: 900, color: soldeNet >= 0 ? '#10b981' : '#ef4444' }}>
                        {soldeNet >= 0 ? '+' : ''}{soldeNet.toLocaleString()}
                    </h3>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>FCFA de bilan</p>
                </div>

                <div className="glass-card" style={{ padding: '24px', background: 'linear-gradient(135deg, var(--primary), #3730a3)', color: 'white' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
                        <p style={{ opacity: 0.8, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Opérations</p>
                        <div style={{ width: '36px', height: '36px', background: 'rgba(255,255,255,0.2)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Smartphone size={18} />
                        </div>
                    </div>
                    <h3 style={{ fontSize: '26px', fontWeight: 900 }}>{transactions.length}</h3>
                    <p style={{ opacity: 0.7, fontSize: '12px', marginTop: '4px' }}>Transactions ce jour</p>
                </div>
            </div>

            {/* ── Corps ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px', alignItems: 'start' }}>

                {/* Colonne gauche */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                    {/* Balances initiales */}
                    <div className="glass-card" style={{ padding: 0 }}>
                        <div style={{ padding: '18px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Coins size={16} color="var(--primary)" />
                            <h3 style={{ fontSize: '15px', fontWeight: 800 }}>Balances Initiales</h3>
                            <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>propriétaire / agent</span>
                        </div>
                        <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px' }}>
                            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px' }}>
                                <p style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase' }}>Cash</p>
                                <p style={{ fontSize: '17px', fontWeight: 800 }}>{(currentJournee.solde_initial_cash_proprio || 0).toLocaleString()} <span style={{ fontSize: '11px', fontWeight: 400 }}>F</span></p>
                                {currentJournee.solde_initial_cash_agent != null && (
                                    <p style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>▸ Agent : {currentJournee.solde_initial_cash_agent.toLocaleString()} F</p>
                                )}
                            </div>
                            {currentJournee.journee_operateur?.map((ob: any) => {
                                const opName = ob.nom_operateur || standOperators.find(so => so.id_operateur === ob.id_operateur)?.operateur?.nom || `Op. ${ob.id_operateur}`;
                                return (
                                    <div key={ob.id_operateur} style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px' }}>
                                        <p style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase' }}>{opName}</p>
                                        <p style={{ fontSize: '17px', fontWeight: 800 }}>{(ob.solde_initial_electro_proprio || 0).toLocaleString()} <span style={{ fontSize: '11px', fontWeight: 400 }}>F</span></p>
                                        {ob.solde_initial_electro_agent != null && (
                                            <p style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>▸ Agent : {ob.solde_initial_electro_agent.toLocaleString()} F</p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Flux de caisse */}
                    <div className="glass-card" style={{ padding: 0 }}>
                        <div style={{ padding: '18px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: '15px', fontWeight: 800 }}>Flux de Caisse Récent</h3>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                {loadingTx && <Loader2 size={14} color="var(--text-muted)" className="animate-spin" />}
                                <Link to="/transactions" style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}>Voir tout</Link>
                            </div>
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <tbody>
                                {transactions.slice(0, 10).map(tx => {
                                    const isDepot = tx.type === 'Dépôt';
                                    const opName = standOperators.find(so => so.id_operateur === tx.id_operateur)?.operateur?.nom;
                                    return (
                                        <tr key={tx.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                                            <td style={{ padding: '14px 20px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div style={{ width: '36px', height: '36px', borderRadius: '11px', background: isDepot ? '#ecfdf5' : '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                        {isDepot ? <ArrowUpRight size={16} color="#10b981" /> : <ArrowDownLeft size={16} color="#ef4444" />}
                                                    </div>
                                                    <div>
                                                        <p style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>{tx.type}</p>
                                                        <p style={{ fontSize: '12px', color: '#94a3b8' }}>{opName || '—'}{tx.commentaire ? ` • ${tx.commentaire}` : ''}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                                                <p style={{ fontSize: '15px', fontWeight: 800, color: isDepot ? '#10b981' : '#ef4444' }}>
                                                    {isDepot ? '+' : '-'}{tx.montant.toLocaleString()} F
                                                </p>
                                                <p style={{ fontSize: '12px', color: '#94a3b8' }}>
                                                    {new Date(tx.date_heure).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {transactions.length === 0 && !loadingTx && (
                                    <tr>
                                        <td colSpan={2} style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                                            Aucune opération enregistrée pour l'instant.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Colonne droite */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

                    {/* CTA */}
                    {currentJournee.statut === 'Ouverte' && (
                        <div style={{ background: 'linear-gradient(135deg, #4f46e5, #3730a3)', padding: '26px', borderRadius: '22px', color: 'white' }}>
                            <h3 style={{ fontSize: '17px', fontWeight: 800, marginBottom: '10px' }}>Action Rapide</h3>
                            <p style={{ opacity: 0.8, fontSize: '13px', marginBottom: '18px', lineHeight: '1.5' }}>
                                Enregistrez un dépôt ou retrait en quelques secondes.
                            </p>
                            <Link to="/transactions" style={{ background: 'white', color: 'var(--primary)', padding: '12px', borderRadius: '11px', textDecoration: 'none', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '14px' }}>
                                <Plus size={16} /> Nouvelle Opération
                            </Link>
                        </div>
                    )}

                    {/* Alerte pré-ouverte (proprio) */}
                    {currentJournee.statut === 'Pre-ouverte' && user?.role === 'Proprietaire' && (
                        <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', padding: '18px', borderRadius: '18px' }}>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
                                <AlertCircle color="#b45309" size={18} />
                                <h4 style={{ color: '#92400e', fontWeight: 800, fontSize: '14px' }}>En attente de l'agent</h4>
                            </div>
                            <p style={{ color: '#b45309', fontSize: '13px', lineHeight: '1.5' }}>
                                L'agent doit confirmer ses balances pour activer le service.
                            </p>
                        </div>
                    )}

                    {/* Info stand */}
                    <div className="glass-card" style={{ padding: '18px' }}>
                        <h4 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '14px', color: '#1e293b' }}>Informations du Stand</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {[
                                { label: 'Nom', value: currentStand?.nom || '—' },
                                { label: 'Statut', value: currentJournee.statut, color: currentJournee.statut === 'Ouverte' ? '#10b981' : '#f59e0b' },
                                { label: 'Opérateurs', value: String(standOperators.length) },
                                { label: 'Date', value: new Date(currentJournee.date_jour + 'T00:00:00').toLocaleDateString('fr-FR') },
                            ].map(item => (
                                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                    <span style={{ color: '#64748b' }}>{item.label}</span>
                                    <span style={{ fontWeight: 700, color: item.color || '#1e293b' }}>{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Tous les stands actifs */}
                    {activeSessions.length > 1 && (
                        <div className="glass-card" style={{ padding: '18px' }}>
                            <h4 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '14px', color: '#1e293b' }}>Mes Sessions Actives</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {activeSessions.map(s => (
                                    <button
                                        key={s.id}
                                        onClick={() => handleSwitchSession(s)}
                                        style={{
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            padding: '12px 14px', borderRadius: '12px', border: '1.5px solid',
                                            borderColor: s.id === currentJournee.id ? 'var(--primary)' : '#e2e8f0',
                                            background: s.id === currentJournee.id ? 'rgba(79,70,229,0.05)' : 'white',
                                            cursor: 'pointer', width: '100%', textAlign: 'left'
                                        }}
                                    >
                                        <div>
                                            <p style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>{s.stand?.nom}</p>
                                        </div>
                                        <span style={{ fontSize: '11px', fontWeight: 700, color: s.statut === 'Ouverte' ? '#10b981' : '#f59e0b', background: s.statut === 'Ouverte' ? '#ecfdf5' : '#fffbeb', padding: '3px 8px', borderRadius: '6px' }}>
                                            {s.statut}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <button onClick={fetchActiveSessions} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', fontSize: '13px' }}>
                        <RefreshCw size={14} /> Actualiser
                    </button>
                </div>
            </div>
        </div>
    );
};
