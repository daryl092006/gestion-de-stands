import React, { useState } from 'react';
import { useAppStore } from '../store/appStore';
import {
    Plus,
    Search,
    Filter,
    ArrowUpRight,
    ArrowDownLeft,
    MessageSquare,
    Smartphone,
    AlertCircle,
    CheckCircle2,
    CalendarDays,
    History as HistoryIcon
} from 'lucide-react';
import { api } from '../services/api';

export const Transactions: React.FC = () => {
    const { transactions, addTransaction, setTransactions, operators, currentJournee } = useAppStore();
    const [type, setType] = useState<'Dépôt' | 'Retrait' | 'Transfert' | 'Paiement'>('Dépôt');
    const [operatorId, setOperatorId] = useState<number>(operators[0]?.id || 0);
    const [montant, setMontant] = useState('');
    const [commentaire, setCommentaire] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [loadingOps, setLoadingOps] = useState(false);
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

    // Charger les opérateurs s'ils manquent
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

    // Initialiser l'opérateur par défaut quand la liste charge
    React.useEffect(() => {
        if (operators.length > 0 && operatorId === 0) {
            setOperatorId(operators[0].id);
        }
    }, [operators, operatorId]);

    // Filter using the user object if needed, though not strictly required for the basic view
    const isDayFullyOpened = currentJournee?.statut === 'Ouverte';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!montant || !currentJournee || !isDayFullyOpened) return;

        setLoadingOps(true); // Re-using loading state for submission
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

    return (
        <div className="animate-fade-in">
            {/* Page Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
                <div>
                    <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', letterSpacing: '-1px' }}>Transactions</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>Journal des flux de trésorerie en temps réel</p>
                </div>

                <button
                    className="btn-primary"
                    onClick={() => setShowForm(!showForm)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '14px 24px',
                        opacity: isDayFullyOpened ? 1 : 0.7,
                        cursor: isDayFullyOpened ? 'pointer' : 'not-allowed'
                    }}
                >
                    {showForm ? 'Annuler' : <><Plus size={20} /> Nouvelle Opération</>}
                </button>
            </div>

            {/* Form Section */}
            {showForm && (
                <div className="glass-card animate-fade-in" style={{ marginBottom: '32px', padding: '0', overflow: 'hidden', border: '1px solid var(--primary)' }}>
                    <div style={{ padding: '24px 32px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Enregistrer un mouvement de fonds</h3>
                    </div>

                    {!isDayFullyOpened ? (
                        <div style={{ padding: '40px', textAlign: 'center' }}>
                            <AlertCircle size={40} color="#ef4444" style={{ marginBottom: '16px' }} />
                            <h4 style={{ color: '#ef4444', fontWeight: 700, marginBottom: '8px' }}>Action bloquée</h4>
                            <p style={{ color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto' }}>
                                Vous ne pouvez pas enregistrer de transactions car aucune journée de travail n'est activement ouverte pour ce stand.
                            </p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} style={{ padding: '32px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginBottom: '24px' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '10px', fontSize: '13px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Type d'Opération</label>
                                    <select value={type} onChange={(e) => setType(e.target.value as any)} style={{ width: '100%', height: '50px' }}>
                                        <option value="Dépôt">Dépôt (Entrée Cash)</option>
                                        <option value="Retrait">Retrait (Sortie Cash)</option>
                                        <option value="Transfert">Transfert Inter-comptes</option>
                                        <option value="Paiement">Paiement Facture/Service</option>
                                    </select>
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '10px', fontSize: '13px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Service / Opérateur</label>
                                    <select value={operatorId} onChange={(e) => setOperatorId(parseInt(e.target.value))} style={{ width: '100%', height: '50px' }}>
                                        {operators.map(op => (
                                            <option key={op.id} value={op.id}>{op.nom}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '10px', fontSize: '13px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Montant Total (FCFA)</label>
                                    <input
                                        type="number"
                                        placeholder="0"
                                        value={montant}
                                        onChange={(e) => setMontant(e.target.value)}
                                        style={{ width: '100%', height: '50px', fontSize: '20px', fontWeight: 800, color: 'var(--primary)' }}
                                        required
                                    />
                                </div>
                            </div>

                            <div style={{ marginBottom: '32px' }}>
                                <label style={{ display: 'block', marginBottom: '10px', fontSize: '13px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Note de référence</label>
                                <div style={{ position: 'relative' }}>
                                    <MessageSquare size={18} style={{ position: 'absolute', left: '16px', top: '16px', color: '#94a3b8' }} />
                                    <textarea
                                        placeholder="Détails de l'opération, numéro client, etc..."
                                        value={commentaire}
                                        onChange={(e) => setCommentaire(e.target.value)}
                                        style={{ width: '100%', paddingLeft: '48px', height: '100px', resize: 'none', paddingTop: '14px' }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <button type="submit" className="btn-primary" style={{ padding: '14px 48px', fontSize: '16px' }}>Enregistrer l'opération</button>
                            </div>
                        </form>
                    )}
                </div>
            )}

            {/* List Section */}
            <div className="glass-card" style={{ padding: '0' }}>
                <div style={{ padding: '24px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ position: 'relative', width: '360px' }}>
                        <Search size={20} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        <input type="text" placeholder="Rechercher par montant ou note..." style={{ width: '100%', paddingLeft: '48px', height: '46px', border: '1px solid #e2e8f0', background: '#f8fafc' }} />
                    </div>
                    <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '10px', background: 'white' }}>
                        <Filter size={18} /> Filtres avancés
                    </button>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                                <th style={{ padding: '16px 32px', fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Opération</th>
                                <th style={{ padding: '16px 32px', fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Opérateur</th>
                                <th style={{ padding: '16px 32px', fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Montant</th>
                                <th style={{ padding: '16px 32px', fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date & Heure</th>
                                <th style={{ padding: '16px 32px', fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Statut</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.map((tx) => (
                                <tr key={tx.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'all 0.2s' }} className="table-row-hover">
                                    <td style={{ padding: '20px 32px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                            <div style={{
                                                width: '42px', height: '42px', borderRadius: '12px',
                                                background: tx.type === 'Dépôt' ? '#ecfdf5' : '#fef2f2',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                                            }}>
                                                {tx.type === 'Dépôt' ? <ArrowUpRight color="#059669" size={20} /> : <ArrowDownLeft color="#dc2626" size={20} />}
                                            </div>
                                            <div>
                                                <p style={{ fontWeight: 800, color: '#1e293b', fontSize: '15px' }}>{tx.type}</p>
                                                <p style={{ fontSize: '12px', color: '#64748b', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.commentaire || 'Sans note'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '20px 32px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#475569', fontWeight: 600 }}>
                                            <Smartphone size={16} color="var(--primary)" />
                                            {operators.find(op => op.id === tx.id_operateur)?.nom || 'Service'}
                                        </div>
                                    </td>
                                    <td style={{ padding: '20px 32px' }}>
                                        <p style={{
                                            fontWeight: 900,
                                            fontSize: '17px',
                                            letterSpacing: '-0.5px',
                                            color: tx.type === 'Dépôt' ? '#059669' : '#dc2626'
                                        }}>
                                            {tx.type === 'Retrait' ? '-' : '+'}{tx.montant.toLocaleString()} F
                                        </p>
                                    </td>
                                    <td style={{ padding: '20px 32px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '14px' }}>
                                            <CalendarDays size={14} />
                                            {new Date(tx.date_heure).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </td>
                                    <td style={{ padding: '20px 32px' }}>
                                        <div style={{
                                            padding: '6px 12px',
                                            background: '#ecfdf5',
                                            color: '#059669',
                                            borderRadius: '20px',
                                            fontSize: '11px',
                                            fontWeight: 800,
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                        }}>
                                            <CheckCircle2 size={12} /> VALIDÉ
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {transactions.length === 0 && (
                        <div style={{ padding: '100px 32px', textAlign: 'center' }}>
                            <div style={{ width: '80px', height: '80px', background: '#f8fafc', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                                <HistoryIcon size={32} color="#cbd5e1" />
                            </div>
                            <h4 style={{ color: '#64748b', marginBottom: '8px' }}>Historique vide</h4>
                            <p style={{ color: '#94a3b8', fontSize: '14px' }}>Aucune transaction n'a été enregistrée pour le moment.</p>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                .table-row-hover:hover {
                    background: #fdfdfd;
                    transform: scale(0.998);
                }
            `}</style>
        </div>
    );
};
