import React, { useState } from 'react';
import { useAppStore } from '../store/appStore';
import {
    Plus,
    Search,
    ArrowUpRight,
    ArrowDownLeft,
    MessageSquare,
    Smartphone,
    AlertCircle,
    CheckCircle2,
    CalendarDays,
    History as HistoryIcon,
    X
} from 'lucide-react';
import { api } from '../services/api';

export const Transactions: React.FC = () => {
    const { transactions, addTransaction, setTransactions, operators, currentJournee } = useAppStore();
    const [type, setType] = useState<'Dépôt' | 'Retrait'>('Dépôt');
    const [operatorId, setOperatorId] = useState<number>(operators[0]?.id || 0);
    const [montant, setMontant] = useState('');
    const [commentaire, setCommentaire] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [loadingOps, setLoadingOps] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const setOperators = useAppStore(state => state.setOperators);

    React.useEffect(() => {
        const fetchTxs = async () => {
            if (currentJournee) {
                try {
                    const data = await api.transactions.getBySession(currentJournee.id);
                    setTransactions(data);
                } catch (err) {
                    console.error("Erreur chargement transactions:", err);
                }
            }
        };
        fetchTxs();
    }, [currentJournee, setTransactions]);

    React.useEffect(() => {
        const fetchOps = async () => {
            if (currentJournee && operators.length === 0 && !loadingOps) {
                setLoadingOps(true);
                try {
                    const data = await api.stands.getOperators(currentJournee.id_stand);
                    setOperators(data.map((o: any) => ({
                        id: o.id_operateur,
                        nom: o.operateur?.nom || 'Inconnu',
                        code: o.operateur?.code || ''
                    })));
                } catch (err) {
                    console.error("Erreur chargement opérateurs:", err);
                } finally {
                    setLoadingOps(false);
                }
            }
        };
        fetchOps();
    }, [currentJournee, operators.length, setOperators, loadingOps]);

    React.useEffect(() => {
        if (operators.length > 0 && operatorId === 0) {
            setOperatorId(operators[0].id);
        }
    }, [operators, operatorId]);

    const isDayFullyOpened = currentJournee?.statut === 'Ouverte';

    // KPIs calculés sur TOUTES les transactions
    const totalDepots = transactions.filter(tx => tx.type === 'Dépôt').reduce((s, tx) => s + tx.montant, 0);
    const totalRetraits = transactions.filter(tx => tx.type === 'Retrait').reduce((s, tx) => s + tx.montant, 0);
    const soldeNet = totalDepots - totalRetraits;

    // Aperçu en temps réel de l'impact
    const montantNum = parseFloat(montant) || 0;
    const newSolde = type === 'Dépôt' ? soldeNet + montantNum : soldeNet - montantNum;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!montant || !currentJournee || !isDayFullyOpened) return;
        setLoadingOps(true);
        try {
            const newTx = await api.transactions.create({
                type,
                id_operateur: operatorId,
                montant: parseFloat(montant),
                date_heure: new Date().toISOString(),
                commentaire,
                id_journee: currentJournee.id
            });
            addTransaction(newTx);
            setMontant('');
            setCommentaire('');
            setShowForm(false);
        } catch (err: any) {
            alert("Erreur lors de l'enregistrement: " + err.message);
        } finally {
            setLoadingOps(false);
        }
    };

    const filteredTx = transactions.filter(tx => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
            tx.type?.toLowerCase().includes(term) ||
            tx.commentaire?.toLowerCase().includes(term) ||
            tx.montant?.toString().includes(term)
        );
    });

    return (
        <div className="animate-fade-in">

            {/* ── KPI MINI BARRE ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '28px' }}>
                <div style={{ background: '#ecfdf5', borderRadius: '16px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <ArrowUpRight size={22} color="#10b981" />
                    <div>
                        <p style={{ fontSize: '11px', color: '#065f46', fontWeight: 700, textTransform: 'uppercase' }}>Dépôts</p>
                        <p style={{ fontSize: '20px', fontWeight: 900, color: '#10b981' }}>{totalDepots.toLocaleString()} F</p>
                    </div>
                </div>
                <div style={{ background: '#fef2f2', borderRadius: '16px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <ArrowDownLeft size={22} color="#ef4444" />
                    <div>
                        <p style={{ fontSize: '11px', color: '#7f1d1d', fontWeight: 700, textTransform: 'uppercase' }}>Retraits</p>
                        <p style={{ fontSize: '20px', fontWeight: 900, color: '#ef4444' }}>{totalRetraits.toLocaleString()} F</p>
                    </div>
                </div>
                <div style={{ background: soldeNet >= 0 ? 'rgba(79,70,229,0.08)' : '#fef2f2', borderRadius: '16px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: soldeNet >= 0 ? 'var(--primary)' : '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ color: 'white', fontSize: '13px', fontWeight: 900 }}>{soldeNet >= 0 ? '+' : '-'}</span>
                    </div>
                    <div>
                        <p style={{ fontSize: '11px', color: '#334155', fontWeight: 700, textTransform: 'uppercase' }}>Solde Net</p>
                        <p style={{ fontSize: '20px', fontWeight: 900, color: soldeNet >= 0 ? 'var(--primary)' : '#ef4444' }}>
                            {soldeNet >= 0 ? '+' : ''}{soldeNet.toLocaleString()} F
                        </p>
                    </div>
                </div>
            </div>

            {/* ── HEADER ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
                <div>
                    <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', letterSpacing: '-1px' }}>Transactions</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>{transactions.length} opération(s) ce jour</p>
                </div>
                {isDayFullyOpened && (
                    <button
                        className="btn-primary"
                        onClick={() => setShowForm(!showForm)}
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 24px' }}
                    >
                        {showForm ? <><X size={18} /> Annuler</> : <><Plus size={20} /> Nouvelle Opération</>}
                    </button>
                )}
            </div>

            {/* ── FORMULAIRE VISUEL ── */}
            {showForm && (
                <div className="glass-card animate-fade-in" style={{ marginBottom: '32px', padding: '32px', border: `2px solid ${type === 'Dépôt' ? '#10b981' : '#ef4444'}`, transition: 'border-color 0.3s' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '28px' }}>Enregistrer un mouvement</h3>

                    {/* Sélecteur de type — BOUTONS VISUELS */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '28px' }}>
                        <button
                            type="button"
                            onClick={() => setType('Dépôt')}
                            style={{
                                padding: '20px',
                                borderRadius: '18px',
                                border: `2px solid ${type === 'Dépôt' ? '#10b981' : '#e2e8f0'}`,
                                background: type === 'Dépôt' ? '#ecfdf5' : 'white',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                display: 'flex', alignItems: 'center', gap: '14px'
                            }}
                        >
                            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: type === 'Dépôt' ? '#10b981' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <ArrowUpRight size={24} color={type === 'Dépôt' ? 'white' : '#94a3b8'} />
                            </div>
                            <div style={{ textAlign: 'left' }}>
                                <p style={{ fontWeight: 800, fontSize: '16px', color: type === 'Dépôt' ? '#065f46' : '#1e293b' }}>DÉPÔT</p>
                                <p style={{ fontSize: '12px', color: type === 'Dépôt' ? '#059669' : '#94a3b8' }}>Entrée Cash ↑</p>
                            </div>
                        </button>

                        <button
                            type="button"
                            onClick={() => setType('Retrait')}
                            style={{
                                padding: '20px',
                                borderRadius: '18px',
                                border: `2px solid ${type === 'Retrait' ? '#ef4444' : '#e2e8f0'}`,
                                background: type === 'Retrait' ? '#fef2f2' : 'white',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                display: 'flex', alignItems: 'center', gap: '14px'
                            }}
                        >
                            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: type === 'Retrait' ? '#ef4444' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <ArrowDownLeft size={24} color={type === 'Retrait' ? 'white' : '#94a3b8'} />
                            </div>
                            <div style={{ textAlign: 'left' }}>
                                <p style={{ fontWeight: 800, fontSize: '16px', color: type === 'Retrait' ? '#7f1d1d' : '#1e293b' }}>RETRAIT</p>
                                <p style={{ fontSize: '12px', color: type === 'Retrait' ? '#dc2626' : '#94a3b8' }}>Sortie Cash ↓</p>
                            </div>
                        </button>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                            {/* Montant */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '10px', fontSize: '13px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                                    Montant (FCFA)
                                </label>
                                <input
                                    type="number"
                                    placeholder="0"
                                    value={montant}
                                    onChange={(e) => setMontant(e.target.value)}
                                    style={{
                                        width: '100%', height: '56px', fontSize: '24px', fontWeight: 900,
                                        color: type === 'Dépôt' ? '#10b981' : '#ef4444',
                                        border: `2px solid ${type === 'Dépôt' ? '#a7f3d0' : '#fecaca'}`,
                                        borderRadius: '14px', padding: '0 16px', background: type === 'Dépôt' ? '#f0fdf4' : '#fff5f5'
                                    }}
                                    required
                                    min="1"
                                />
                            </div>

                            {/* Opérateur */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '10px', fontSize: '13px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                                    Opérateur Mobile Money
                                </label>
                                <select
                                    value={operatorId}
                                    onChange={(e) => setOperatorId(parseInt(e.target.value))}
                                    style={{ width: '100%', height: '56px', fontSize: '15px', borderRadius: '14px', border: '2px solid #e2e8f0', padding: '0 16px' }}
                                >
                                    {operators.map(op => (
                                        <option key={op.id} value={op.id}>{op.nom}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Note */}
                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', marginBottom: '10px', fontSize: '13px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                                Note / Référence
                            </label>
                            <div style={{ position: 'relative' }}>
                                <MessageSquare size={16} style={{ position: 'absolute', left: '14px', top: '14px', color: '#94a3b8' }} />
                                <input
                                    type="text"
                                    placeholder="Numéro client, référence..."
                                    value={commentaire}
                                    onChange={(e) => setCommentaire(e.target.value)}
                                    style={{ width: '100%', height: '48px', paddingLeft: '40px', borderRadius: '12px', border: '2px solid #e2e8f0' }}
                                />
                            </div>
                        </div>

                        {/* Aperçu impact solde */}
                        {montantNum > 0 && (
                            <div style={{
                                background: type === 'Dépôt' ? '#ecfdf5' : '#fef2f2',
                                border: `1px solid ${type === 'Dépôt' ? '#a7f3d0' : '#fecaca'}`,
                                borderRadius: '14px', padding: '16px 20px', marginBottom: '24px',
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                            }}>
                                <div>
                                    <p style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Solde net après opération</p>
                                    <p style={{ fontSize: '22px', fontWeight: 900, color: newSolde >= 0 ? '#10b981' : '#ef4444' }}>
                                        {newSolde >= 0 ? '+' : ''}{newSolde.toLocaleString()} F
                                    </p>
                                </div>
                                <div style={{ textAlign: 'right', fontSize: '13px', color: '#64748b' }}>
                                    <p>Avant : {soldeNet >= 0 ? '+' : ''}{soldeNet.toLocaleString()} F</p>
                                    <p style={{ color: type === 'Dépôt' ? '#10b981' : '#ef4444', fontWeight: 700 }}>
                                        {type === 'Dépôt' ? '+' : '-'}{montantNum.toLocaleString()} F
                                    </p>
                                </div>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loadingOps}
                            style={{
                                width: '100%', padding: '16px', fontSize: '16px', fontWeight: 800,
                                borderRadius: '14px', border: 'none', cursor: 'pointer',
                                background: type === 'Dépôt' ? '#10b981' : '#ef4444',
                                color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                                opacity: loadingOps ? 0.7 : 1
                            }}
                        >
                            {type === 'Dépôt' ? <ArrowUpRight size={20} /> : <ArrowDownLeft size={20} />}
                            {loadingOps ? 'Enregistrement...' : `Valider le ${type} de ${montantNum > 0 ? montantNum.toLocaleString() + ' F' : '...'}`}
                        </button>
                    </form>
                </div>
            )}

            {/* ── LISTE DES TRANSACTIONS ── */}
            <div className="glass-card" style={{ padding: '0' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        <input
                            type="text"
                            placeholder="Rechercher..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            style={{ width: '100%', paddingLeft: '38px', height: '42px', border: '1px solid #e2e8f0', borderRadius: '10px', background: '#f8fafc', fontSize: '14px' }}
                        />
                    </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                                <th style={{ padding: '14px 24px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Opération</th>
                                <th style={{ padding: '14px 24px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Opérateur</th>
                                <th style={{ padding: '14px 24px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Montant</th>
                                <th style={{ padding: '14px 24px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Heure</th>
                                <th style={{ padding: '14px 24px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Note</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTx.map((tx) => {
                                const isDepot = tx.type === 'Dépôt';
                                return (
                                    <tr key={tx.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}
                                        onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')}
                                        onMouseLeave={e => (e.currentTarget.style.background = 'white')}
                                    >
                                        <td style={{ padding: '16px 24px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{
                                                    width: '38px', height: '38px', borderRadius: '11px',
                                                    background: isDepot ? '#ecfdf5' : '#fef2f2',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                                }}>
                                                    {isDepot
                                                        ? <ArrowUpRight color="#10b981" size={18} />
                                                        : <ArrowDownLeft color="#ef4444" size={18} />
                                                    }
                                                </div>
                                                <span style={{
                                                    fontWeight: 800, fontSize: '13px',
                                                    color: isDepot ? '#065f46' : '#7f1d1d',
                                                    background: isDepot ? '#ecfdf5' : '#fef2f2',
                                                    padding: '4px 10px', borderRadius: '20px'
                                                }}>
                                                    {tx.type}
                                                </span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px 24px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569' }}>
                                                <Smartphone size={14} color="var(--primary)" />
                                                <span style={{ fontWeight: 600, fontSize: '14px' }}>
                                                    {operators.find(op => op.id === tx.id_operateur)?.nom || 'Service'}
                                                </span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px 24px' }}>
                                            <span style={{
                                                fontWeight: 900, fontSize: '16px',
                                                color: isDepot ? '#10b981' : '#ef4444'
                                            }}>
                                                {isDepot ? '+' : '-'}{tx.montant.toLocaleString()} F
                                            </span>
                                        </td>
                                        <td style={{ padding: '16px 24px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '13px' }}>
                                                <CalendarDays size={13} />
                                                {new Date(tx.date_heure).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px 24px', fontSize: '13px', color: '#94a3b8', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {tx.commentaire || <span style={{ fontStyle: 'italic' }}>—</span>}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {filteredTx.length === 0 && (
                        <div style={{ padding: '80px 32px', textAlign: 'center' }}>
                            <div style={{ width: '72px', height: '72px', background: '#f8fafc', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                                <HistoryIcon size={28} color="#cbd5e1" />
                            </div>
                            <p style={{ color: '#64748b', fontWeight: 700, marginBottom: '6px' }}>Historique vide</p>
                            <p style={{ color: '#94a3b8', fontSize: '14px' }}>Aucune transaction enregistrée pour le moment.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Alerte journée non ouverte */}
            {!isDayFullyOpened && currentJournee && (
                <div style={{ marginTop: '24px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '16px', padding: '20px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <AlertCircle color="#d97706" size={20} />
                    <p style={{ color: '#92400e', fontWeight: 600, fontSize: '14px' }}>
                        La journée est en statut <strong>{currentJournee.statut}</strong>. Les transactions ne peuvent être enregistrées que lorsque la journée est <strong>Ouverte</strong>.
                    </p>
                </div>
            )}
        </div>
    );
};
