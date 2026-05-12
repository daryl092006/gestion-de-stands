import React, { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../store/appStore';
import {
    Square,
    CheckCircle2,
    UserCheck,
    Store,
    ArrowLeft,
    Check,
    Edit3,
    Loader2,
    AlertCircle
} from 'lucide-react';
import { CashCounter } from '../components/CashCounter';
import { api } from '../services/api';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────
type View = 'list' | 'opening-form' | 'pre-opened-waiting' | 'agent-confirm' | 'open' | 'no-session' | 'closing-form';

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────
export const JourneePage: React.FC = () => {
    const { user, currentJournee, setJournee, setCurrentStand, setOperators } = useAppStore();

    // UI State
    const [view, setView] = useState<View>('list');
    const [loading, setLoading] = useState(false);
    const [standsLoading, setStandsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Data
    const [stands, setStands] = useState<any[]>([]);
    const [selectedStand, setSelectedStand] = useState<any | null>(null);
    const [standOperators, setStandOperators] = useState<any[]>([]);

    // Form values
    const [cash, setCash] = useState('');
    const [operatorBalances, setOperatorBalances] = useState<Record<number, string>>({});
    const [isEditingName, setIsEditingName] = useState(false);
    const [newName, setNewName] = useState('');

    // ──────────────────────────────────────────
    // Sélectionner un stand → charger sa session
    // ──────────────────────────────────────────
    const handleSelectStand = useCallback(async (stand: any) => {
        setSelectedStand(stand);
        setError(null);
        setCash('');
        setOperatorBalances({});
        setLoading(true);

        try {
            const [ops, session] = await Promise.all([
                api.stands.getOperators(stand.id),
                api.sessions.getStandCurrentSession(stand.id)
            ]);

            setStandOperators(ops);
            setOperators(ops.map((o: any) => ({
                id: o.id_operateur,
                nom: o.operateur?.nom || 'Inconnu',
                code: o.operateur?.code || ''
            })));
            setJournee(session);
            setCurrentStand(stand); // ← on notifie le store du stand actif

            // Déterminer la bonne vue selon l'état de la session
            if (!session) {
                if (user?.role === 'Agent') {
                    setView('no-session');
                } else {
                    setView('opening-form');
                }
            } else if (session.statut === 'Pre-ouverte') {
                if (user?.role === 'Agent') {
                    setView('agent-confirm');
                } else {
                    setView('pre-opened-waiting');
                }
            } else if (session.statut === 'Ouverte') {
                setView('open');
            }
        } catch (err: any) {
            setError('Impossible de charger les données du stand.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [user?.role, setJournee, setCurrentStand, setOperators]);

    // ──────────────────────────────────────────
    // Charger les stands de l'utilisateur (une seule fois)
    // ──────────────────────────────────────────
    const fetchStands = useCallback(async () => {
        if (!user?.id) return;
        setStandsLoading(true);
        try {
            let data: any[] = [];
            if (user.role === 'Proprietaire') {
                data = await api.stands.getByOwner(user.id);
            } else if (user.role === 'Agent') {
                data = await api.stands.getByAgent(user.id);
            }
            setStands(data);

            // AUTO-SELECT : Si c'est un agent et qu'il n'a qu'un seul stand, on le sélectionne direct
            const isAgent = user.role.toLowerCase() === 'agent';
            if (isAgent && data.length === 1 && view === 'list') {
                handleSelectStand(data[0]);
            }
        } catch (err) {
            console.error('Error fetching stands:', err);
        } finally {
            setStandsLoading(false);
        }
    }, [user?.id, user?.role, view, handleSelectStand]);

    useEffect(() => {
        fetchStands();
    }, [fetchStands]);

    // ──────────────────────────────────────────
    // Retour à la liste
    // ──────────────────────────────────────────
    const handleReturn = () => {
        setView('list');
        setSelectedStand(null);
        setCurrentStand(null);
        setJournee(null);
        setError(null);
        setCash('');
        setOperatorBalances({});
        setIsEditingName(false);
    };

    // ──────────────────────────────────────────
    // Pré-ouvrir la journée (Propriétaire)
    // ──────────────────────────────────────────
    const handleOpenDay = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStand || !user) return;
        setLoading(true);
        setError(null);

        try {
            const journeeData = {
                date_jour: new Date().toISOString().split('T')[0],
                solde_initial_cash_proprio: parseFloat(cash) || 0,
                id_stand: selectedStand.id,
                id_proprietaire: user.id,
                statut: 'Pre-ouverte'
            };

            const operatorsData = standOperators.map(so => ({
                id_operateur: so.id_operateur,
                solde_initial_electro_proprio: parseFloat(operatorBalances[so.id_operateur]) || 0
            }));

            const newSession = await api.sessions.preOpen(journeeData, operatorsData);
            setJournee({
                ...newSession,
                journee_operateur: operatorsData.map(od => ({
                    ...od,
                    nom_operateur: standOperators.find(so => so.id_operateur === od.id_operateur)?.operateur?.nom
                }))
            } as any);
            setView('pre-opened-waiting');
        } catch (err: any) {
            setError(`Erreur lors de la pré-ouverture : ${err.message || 'Problème inconnu'}`);
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // ──────────────────────────────────────────
    // Confirmer l'ouverture (Agent)
    // ──────────────────────────────────────────
    const handleConfirmOpening = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentJournee || !user) return;
        setLoading(true);
        setError(null);

        const agentCash = Number(cash) || 0;
        const proprioCash = Number(currentJournee.solde_initial_cash_proprio) || 0;

        // --- LOGIQUE DE SUSPENSION AUTOMATIQUE ---
        // On compare strictement les nombres et on ignore la casse du rôle
        if (user.role.toLowerCase() === 'agent' && agentCash !== proprioCash) {
            try {
                // 1. Suspension en base de données
                await api.profiles.suspend(user.id);

                // 2. Mise à jour du store pour déclencher la redirection immédiate
                useAppStore.getState().setUser({ ...user, is_suspended: true });

                setLoading(false);
                return; // FIN : L'utilisateur sera redirigé par le ProtectedRoute
            } catch (err) {
                console.error("Erreur critique lors de la suspension:", err);
            }
        }

        try {
            const agentData = { solde_initial_cash_agent: agentCash };
            const operatorsAgentData = currentJournee.journee_operateur.map((op: any) => ({
                id_operateur: op.id_operateur,
                solde_initial_electro_agent: parseFloat(operatorBalances[op.id_operateur]) || 0
            }));

            await api.sessions.confirmOpening(currentJournee.id, agentData, operatorsAgentData);
            const updated = await api.sessions.getStandCurrentSession(currentJournee.id_stand);
            setJournee(updated);
            setView('open');
        } catch (err: any) {
            setError(`Erreur lors de la confirmation : ${err.message || 'Problème inconnu'}`);
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCloseDayWithData = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentJournee) return;
        setLoading(true);
        setError(null);

        try {
            const data = {
                cash_final: parseFloat(cash) || 0,
                operators: currentJournee.journee_operateur.map((op: any) => ({
                    id_operateur: op.id_operateur,
                    solde_final_electro: parseFloat(operatorBalances[op.id_operateur]) || 0
                }))
            };

            await api.sessions.submitClosing(currentJournee.id, data);
            handleReturn();
        } catch (err: any) {
            setError(`Erreur lors de la clôture : ${err.message}`);
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // ──────────────────────────────────────────
    // Clôturer la journée (Ancien bouton direct)
    // ──────────────────────────────────────────
    const handleCloseDay = async () => {
        if (!currentJournee) return;
        if (!window.confirm('Voulez-vous vraiment clôturer cette journée ?')) return;
        setLoading(true);
        try {
            await api.sessions.close(currentJournee.id);
            handleReturn();
        } catch (err: any) {
            setError(`Erreur lors de la clôture : ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    // ──────────────────────────────────────────
    // Renommer le stand
    // ──────────────────────────────────────────
    const handleRenameStand = async () => {
        if (!selectedStand || !newName.trim()) return;
        try {
            await api.stands.updateName(selectedStand.id, newName.trim());
            const updatedStand = { ...selectedStand, nom: newName.trim() };
            setSelectedStand(updatedStand);
            setStands(prev => prev.map(s => s.id === selectedStand.id ? updatedStand : s));
            setIsEditingName(false);
        } catch (err) {
            console.error('Error renaming stand:', err);
        }
    };

    // ──────────────────────────────────────────
    // RENDER
    // ──────────────────────────────────────────

    // === ERROR BANNER ===
    const ErrorBanner = error ? (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '16px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px', color: '#dc2626' }}>
            <AlertCircle size={18} />
            <span style={{ fontSize: '14px', fontWeight: 600 }}>{error}</span>
        </div>
    ) : null;

    // === BACK BUTTON ===
    const BackButton = (
        <button onClick={handleReturn} className="btn-secondary" style={{ marginBottom: '24px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <ArrowLeft size={16} /> Retour aux stands
        </button>
    );

    // ─────────── VUE : LISTE DES STANDS ───────────
    if (view === 'list') {
        const isAgent = user?.role?.toLowerCase() === 'agent';
        // Si on est en train d'auto-sélectionner le stand unique pour un agent, on reste en chargement
        if (standsLoading || (isAgent && stands.length === 1)) {
            return (
                <div style={{ textAlign: 'center', padding: '100px 20px', color: 'var(--text-muted)' }}>
                    <Loader2 size={48} className="animate-spin" style={{ margin: '0 auto 24px', display: 'block', color: 'var(--primary)' }} />
                    <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>Préparation de votre poste...</h3>
                    <p>Nous configurons votre espace de travail.</p>
                </div>
            );
        }

        return (
            <div className="animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: '48px' }}>
                    <div style={{ width: '80px', height: '80px', background: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }}>
                        <Store color="var(--primary)" size={32} />
                    </div>
                    <h2 style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', marginBottom: '12px' }}>
                        {user?.role === 'Proprietaire' ? 'Mes Points de Vente' : 'Mes Stands'}
                    </h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '16px' }}>
                        {user?.role === 'Proprietaire'
                            ? 'Sélectionnez un stand pour gérer sa journée.'
                            : 'Sélectionnez votre stand pour prendre votre poste.'}
                    </p>
                </div>

                {stands.length === 0 ? (
                    <div className="glass-card" style={{ textAlign: 'center', padding: '60px' }}>
                        <AlertCircle size={40} color="#94a3b8" style={{ margin: '0 auto 16px', display: 'block' }} />
                        <h3 style={{ fontWeight: 700, marginBottom: '8px' }}>Aucun stand trouvé</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                            {user?.role === 'Proprietaire' ? 'Créez votre premier stand dans l\'espace de configuration.' : 'Demandez à votre propriétaire de vous affecter à un stand.'}
                        </p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                        {stands.map(s => (
                            <div
                                key={s.id}
                                onClick={() => handleSelectStand(s)}
                                style={{
                                    padding: '28px',
                                    borderRadius: '24px',
                                    cursor: 'pointer',
                                    background: 'white',
                                    border: '2px solid #e2e8f0',
                                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)',
                                    transition: 'all 0.2s',
                                    textAlign: 'left',
                                }}
                                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
                                onMouseLeave={e => (e.currentTarget.style.borderColor = '#e2e8f0')}
                            >
                                <div style={{ width: '52px', height: '52px', borderRadius: '16px', background: 'var(--primary-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                                    <Store size={24} color="var(--primary)" />
                                </div>
                                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#1e293b', marginBottom: '4px' }}>{s.nom}</h3>
                                <p style={{ fontSize: '13px', color: '#94a3b8' }}>{s.localisation || 'Sans adresse'}</p>
                                <div style={{ marginTop: '20px', fontSize: '13px', fontWeight: 700, color: 'var(--primary)' }}>
                                    Gérer →
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }


    // ─────────── VUE : FORMULAIRE D'OUVERTURE (PROPRIO) ───────────
    if (view === 'opening-form') {
        return (
            <div className="animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto' }}>
                {BackButton}
                {ErrorBanner}
                <div className="glass-card">
                    {/* Header du stand */}
                    <div style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            {isEditingName ? (
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    <input
                                        value={newName}
                                        onChange={e => setNewName(e.target.value)}
                                        style={{ fontSize: '22px', fontWeight: 800, border: '2px solid var(--primary)', borderRadius: '12px', padding: '8px 14px' }}
                                        autoFocus
                                    />
                                    <button className="btn-primary" onClick={handleRenameStand} style={{ height: '48px', width: '48px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Check size={18} />
                                    </button>
                                    <button className="btn-secondary" onClick={() => setIsEditingName(false)} style={{ height: '48px', width: '48px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        ✕
                                    </button>
                                </div>
                            ) : (
                                <h2 style={{ fontSize: '26px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    {selectedStand?.nom}
                                    <button onClick={() => { setIsEditingName(true); setNewName(selectedStand?.nom || ''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px' }}>
                                        <Edit3 size={16} />
                                    </button>
                                </h2>
                            )}
                            <p style={{ color: '#64748b', marginTop: '4px' }}>Saisissez les balances initiales pour pré-ouvrir la journée.</p>
                        </div>
                    </div>

                    <form onSubmit={handleOpenDay}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '48px' }}>
                            {/* Cash */}
                            <div>
                                <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '20px', color: '#1e293b' }}>💰 Comptage du Cash</h3>
                                <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '16px', marginBottom: '16px' }}>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#64748b', marginBottom: '8px' }}>TOTAL</label>
                                    <input
                                        type="number"
                                        placeholder="0"
                                        style={{ width: '100%', fontSize: '28px', fontWeight: 900, color: 'var(--primary)', border: 'none', background: 'transparent', padding: '0' }}
                                        value={cash}
                                        onChange={e => setCash(e.target.value)}
                                        required
                                    />
                                </div>
                                <CashCounter onTotalChange={total => setCash(total.toString())} />
                            </div>

                            {/* E-Money */}
                            <div>
                                <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '20px', color: '#1e293b' }}>📱 Balances E-Money</h3>
                                {standOperators.length === 0 ? (
                                    <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
                                        Aucun opérateur configuré pour ce stand.
                                    </div>
                                ) : (
                                    standOperators.map(so => (
                                        <div key={so.id_operateur} style={{ marginBottom: '16px', background: '#f8fafc', padding: '20px', borderRadius: '16px' }}>
                                            <label style={{ display: 'block', fontWeight: 700, fontSize: '14px', marginBottom: '8px', color: '#1e293b' }}>
                                                {so.operateur?.nom}
                                                {so.numero_compte && <span style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 400, marginLeft: '8px' }}>({so.numero_compte})</span>}
                                            </label>
                                            <input
                                                type="number"
                                                placeholder="0"
                                                style={{ width: '100%' }}
                                                value={operatorBalances[so.id_operateur] || ''}
                                                onChange={e => setOperatorBalances(prev => ({ ...prev, [so.id_operateur]: e.target.value }))}
                                                required
                                            />
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '40px', padding: '18px', fontSize: '16px' }} disabled={loading}>
                            {loading ? <><Loader2 size={18} className="animate-spin" /> Enregistrement...</> : '✓ Valider et Pré-ouvrir la Session'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // ─────────── VUE : EN ATTENTE DE L'AGENT (PROPRIO) ───────────
    if (view === 'pre-opened-waiting') {
        return (
            <div className="animate-fade-in" style={{ maxWidth: '700px', margin: '0 auto' }}>
                {BackButton}
                {ErrorBanner}
                <div className="glass-card" style={{ textAlign: 'center', padding: '80px 40px' }}>
                    <div style={{ width: '100px', height: '100px', background: 'rgba(79, 70, 229, 0.06)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 32px' }}>
                        <UserCheck size={52} color="var(--primary)" />
                    </div>
                    <h2 style={{ fontSize: '26px', fontWeight: 800, marginBottom: '12px' }}>Pré-ouverture enregistrée</h2>
                    <p style={{ color: 'var(--text-muted)', maxWidth: '380px', margin: '0 auto 32px', fontSize: '15px' }}>
                        En attente de la confirmation de l'agent pour le stand <strong>{selectedStand?.nom}</strong>.
                    </p>
                    <button className="btn-secondary" onClick={handleReturn}>Retour à la liste</button>
                </div>
            </div>
        );
    }

    // ─────────── VUE : CONFIRMATION AGENT ───────────
    if (view === 'agent-confirm') {
        return (
            <div className="animate-fade-in" style={{ maxWidth: '900px', margin: '0 auto' }}>
                {BackButton}
                {ErrorBanner}
                <div style={{ background: 'var(--primary)', color: 'white', padding: '36px 40px', borderRadius: '24px', marginBottom: '28px' }}>
                    <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '8px' }}>Prise de poste — {selectedStand?.nom}</h2>
                    <p style={{ opacity: 0.85, fontSize: '15px' }}>Confirmez vos balances réelles observées sur le terrain pour ouvrir le service.</p>
                </div>

                <form onSubmit={handleConfirmOpening} className="glass-card">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '40px' }}>
                        <div>
                            <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '20px' }}>💰 Votre Cash Réel</h3>
                            <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '16px', marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#64748b', marginBottom: '8px' }}>TOTAL</label>
                                <input type="number" placeholder="0" style={{ width: '100%', fontSize: '28px', fontWeight: 900, color: 'var(--primary)', border: 'none', background: 'transparent', padding: '0' }} value={cash} onChange={e => setCash(e.target.value)} required />
                            </div>
                            <CashCounter onTotalChange={total => setCash(total.toString())} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '20px' }}>📱 Balances E-Money</h3>
                            {currentJournee?.journee_operateur?.map((op: any) => (
                                <div key={op.id_operateur} style={{ background: '#f8fafc', padding: '20px', borderRadius: '16px', marginBottom: '16px' }}>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>
                                        {op.nom_operateur || standOperators.find(so => so.id_operateur === op.id_operateur)?.operateur?.nom || `Opérateur ${op.id_operateur}`}
                                    </label>
                                    <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>Balance initiale (proprio) : {op.solde_initial_electro_proprio?.toLocaleString()} F</p>
                                    <input type="number" placeholder="Valeur réelle" style={{ width: '100%' }} value={operatorBalances[op.id_operateur] || ''} onChange={e => setOperatorBalances(prev => ({ ...prev, [op.id_operateur]: e.target.value }))} required />
                                </div>
                            ))}
                        </div>
                    </div>
                    <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '40px', padding: '18px', fontSize: '16px' }} disabled={loading}>
                        {loading ? <><Loader2 size={18} className="animate-spin" /> Activation...</> : '✓ Confirmer et Ouvrir le Service'}
                    </button>
                </form>
            </div>
        );
    }

    // ─────────── VUE : SERVICE OUVERT ───────────
    if (view === 'open') {
        return (
            <div className="animate-fade-in" style={{ maxWidth: '700px', margin: '0 auto' }}>
                {BackButton}
                {ErrorBanner}
                <div className="glass-card" style={{ textAlign: 'center', padding: '80px 40px' }}>
                    <div style={{ width: '100px', height: '100px', background: '#ecfdf5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 32px' }}>
                        <CheckCircle2 color="#10b981" size={56} />
                    </div>
                    <h2 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '12px' }}>Service Actif</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>{selectedStand?.nom}</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '15px', marginBottom: '40px' }}>Le stand est ouvert et prêt pour les transactions.</p>

                    <button className="btn-primary" onClick={() => setView('closing-form')} style={{ background: '#f59e0b', borderColor: '#f59e0b', marginBottom: '12px', width: '100%' }}>
                        🏁 Faire le Bilan et Clôturer la journée
                    </button>

                    {user?.role === 'Proprietaire' && (
                        <button className="btn-secondary" onClick={handleCloseDay} disabled={loading} style={{ color: '#ef4444', borderColor: '#fecaca', width: '100%' }}>
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <Square size={16} />} Clôturer sans bilan (Urgence)
                        </button>
                    )}
                </div>
            </div>
        );
    }

    // ─────────── VUE : FORMULAIRE DE CLÔTURE ───────────
    if (view === 'closing-form') {
        return (
            <div className="animate-fade-in" style={{ maxWidth: '900px', margin: '0 auto' }}>
                <button onClick={() => setView('open')} className="btn-secondary" style={{ marginBottom: '24px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <ArrowLeft size={16} /> Retour au service
                </button>
                {ErrorBanner}

                <div style={{ background: '#f59e0b', color: 'white', padding: '36px 40px', borderRadius: '24px', marginBottom: '28px' }}>
                    <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '8px' }}>Bilan de Clôture — {selectedStand?.nom}</h2>
                    <p style={{ opacity: 0.9, fontSize: '15px' }}>Saisissez vos balances finales réelles pour terminer la journée.</p>
                </div>

                <form onSubmit={handleCloseDayWithData} className="glass-card">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '40px' }}>
                        <div>
                            <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '20px' }}>💰 Cash Final en Caisse</h3>
                            <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '16px', marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#64748b', marginBottom: '8px' }}>TOTAL COMPTÉ</label>
                                <input type="number" placeholder="0" style={{ width: '100%', fontSize: '28px', fontWeight: 900, color: '#f59e0b', border: 'none', background: 'transparent', padding: '0' }} value={cash} onChange={e => setCash(e.target.value)} required />
                            </div>
                            <CashCounter onTotalChange={total => setCash(total.toString())} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '20px' }}>📱 Balances E-Money Finales</h3>
                            {currentJournee?.journee_operateur?.map((op: any) => (
                                <div key={op.id_operateur} style={{ background: '#f8fafc', padding: '20px', borderRadius: '16px', marginBottom: '16px' }}>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>
                                        {op.nom_operateur || standOperators.find(so => so.id_operateur === op.id_operateur)?.operateur?.nom || `Opérateur ${op.id_operateur}`}
                                    </label>
                                    <input type="number" placeholder="Balance finale réelle" style={{ width: '100%' }} value={operatorBalances[op.id_operateur] || ''} onChange={e => setOperatorBalances(prev => ({ ...prev, [op.id_operateur]: e.target.value }))} required />
                                </div>
                            ))}
                        </div>
                    </div>
                    <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '40px', padding: '18px', fontSize: '16px', background: '#f59e0b', borderColor: '#f59e0b' }} disabled={loading}>
                        {loading ? <><Loader2 size={18} className="animate-spin" /> Clôture en cours...</> : '✓ Valider le Bilan et Fermer le Stand'}
                    </button>
                </form>
            </div>
        );
    }

    // ─────────── VUE : PAS DE SESSION POUR L'AGENT ───────────
    if (view === 'no-session') {
        return (
            <div className="animate-fade-in" style={{ maxWidth: '700px', margin: '0 auto' }}>
                {BackButton}
                <div className="glass-card" style={{ textAlign: 'center', padding: '80px 40px' }}>
                    <div style={{ width: '80px', height: '80px', background: '#fef2f2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 32px' }}>
                        <AlertCircle color="#ef4444" size={40} />
                    </div>
                    <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '12px' }}>Session non préparée</h2>
                    <p style={{ color: 'var(--text-muted)', maxWidth: '380px', margin: '0 auto 32px', fontSize: '15px' }}>
                        Le propriétaire n'a pas encore initié la journée pour le stand <strong>{selectedStand?.nom}</strong>. Contactez-le pour qu'il pré-ouvre la session.
                    </p>
                    <button className="btn-secondary" onClick={handleReturn}>Retour à la liste</button>
                </div>
            </div>
        );
    }

    return null;
};
