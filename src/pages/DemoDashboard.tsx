import React from 'react';
import {
    LayoutDashboard, PlusCircle, Calendar, Wallet,
    TrendingUp, ArrowUpRight, ArrowDownRight, Clock,
    MapPin, User
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const DemoDashboard: React.FC = () => {
    const navigate = useNavigate();

    // Données fictives pour la démo
    const stats = [
        { label: 'Chiffre d\'Affaire (24h)', value: '1,240,500 FCFA', icon: <TrendingUp size={20} color="#10b981" />, trend: '+12.5%' },
        { label: 'Transactions', value: '142', icon: <Clock size={20} color="#6366f1" />, trend: '+8%' },
        { label: 'Stands Actifs', value: '12 / 12', icon: <MapPin size={20} color="#f59e0b" />, trend: 'Stable' },
        { label: 'Commissions Est.', value: '38,200 FCFA', icon: <Wallet size={20} color="#ec4899" />, trend: '+15%' },
    ];

    const recentTransactions = [
        { type: 'Dépôt', operator: 'MTN MoMo', amount: '25,000', agent: 'Moussa K.', time: 'il y a 2 min', status: 'Succès' },
        { type: 'Retrait', operator: 'Wave', amount: '10,000', agent: 'Awa D.', time: 'il y a 5 min', status: 'Succès' },
        { type: 'Dépôt', operator: 'Moov', amount: '50,000', agent: 'Moussa K.', time: 'il y a 12 min', status: 'En attente' },
        { type: 'Retrait', operator: 'MTN MoMo', amount: '5,000', agent: 'Jean P.', time: 'il y a 15 min', status: 'Succès' },
    ];

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: "'Outfit', sans-serif", position: 'relative' }}>
            {/* Top Demo Banner */}
            <div style={{
                position: 'fixed', top: 0, left: 0, right: 0, zIndex: 2000,
                background: 'rgba(79, 70, 229, 0.95)', color: 'white',
                padding: '10px', textAlign: 'center', fontWeight: 700, fontSize: '14px',
                backdropFilter: 'blur(8px)', borderBottom: '1px solid rgba(255,255,255,0.1)',
                display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px'
            }}>
                <span>🚀 VOUS ÊTES EN MODE DÉMONSTRATION (CONSULTATION UNIQUEMENT)</span>
                <button
                    onClick={() => navigate('/')}
                    style={{ background: 'white', color: '#4f46e5', border: 'none', padding: '4px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}
                >
                    QUITTER LA DÉMO
                </button>
            </div>

            {/* Sidebar Mockup */}
            <aside style={{ width: '280px', background: 'white', borderRight: '1px solid #e2e8f0', padding: '60px 20px 32px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px' }}>
                    <div style={{ width: '40px', height: '40px', background: '#4f46e5', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Wallet color="white" size={20} />
                    </div>
                    <span style={{ fontWeight: 800, fontSize: '18px' }}>STAND MANAGER</span>
                </div>

                <nav style={{ flex: 1, pointerEvents: 'none', opacity: 0.8 }}>
                    {[
                        { name: 'Dashboard', icon: <LayoutDashboard size={20} />, active: true },
                        { name: 'Transactions', icon: <PlusCircle size={20} /> },
                        { name: 'Ma Journée', icon: <Calendar size={20} /> },
                    ].map(item => (
                        <div key={item.name} style={{
                            display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '12px',
                            background: item.active ? '#eff6ff' : 'transparent',
                            color: item.active ? '#3b82f6' : '#64748b',
                            fontWeight: item.active ? 700 : 500,
                            marginBottom: '4px', cursor: 'default'
                        }}>
                            {item.icon} {item.name}
                        </div>
                    ))}
                </nav>
            </aside>

            {/* Main Content */}
            <main style={{ flex: 1, padding: '80px 40px 40px', pointerEvents: 'none', cursor: 'not-allowed' }}>
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                    <div>
                        <h1 style={{ fontSize: '24px', fontWeight: 800 }}>Tableau de Bord Global</h1>
                        <p style={{ color: '#64748b' }}>Aperçu en temps réel de votre activité.</p>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <div style={{ textAlign: 'right' }}>
                            <p style={{ fontWeight: 700 }}>Utilisateur Démo</p>
                            <p style={{ fontSize: '12px', color: '#64748b' }}>Propriétaire</p>
                        </div>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <User size={20} color="#475569" />
                        </div>
                    </div>
                </header>

                {/* Stats Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '40px' }}>
                    {stats.map(stat => (
                        <div key={stat.label} style={{ background: 'white', padding: '24px', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{stat.icon}</div>
                                <span style={{ fontSize: '12px', fontWeight: 700, color: '#10b981', padding: '4px 8px', background: '#ecfdf5', borderRadius: '6px' }}>{stat.trend}</span>
                            </div>
                            <p style={{ fontSize: '14px', color: '#64748b', fontWeight: 500, marginBottom: '4px' }}>{stat.label}</p>
                            <p style={{ fontSize: '22px', fontWeight: 800 }}>{stat.value}</p>
                        </div>
                    ))}
                </div>

                {/* Transactions Table Mockup */}
                <div style={{ background: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', padding: '32px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Dernières Opérations</h2>
                        <button style={{ color: '#4f46e5', fontWeight: 600, background: 'transparent', border: 'none', cursor: 'pointer' }}>Voir tout</button>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ textAlign: 'left', borderBottom: '1px solid #f1f5f9' }}>
                                <th style={{ padding: '12px', color: '#94a3b8', fontSize: '13px', fontWeight: 600 }}>TYPE</th>
                                <th style={{ padding: '12px', color: '#94a3b8', fontSize: '13px', fontWeight: 600 }}>OPÉRATEUR</th>
                                <th style={{ padding: '12px', color: '#94a3b8', fontSize: '13px', fontWeight: 600 }}>MONTANT</th>
                                <th style={{ padding: '12px', color: '#94a3b8', fontSize: '13px', fontWeight: 600 }}>AGENT</th>
                                <th style={{ padding: '12px', color: '#94a3b8', fontSize: '13px', fontWeight: 600 }}>STATUT</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentTransactions.map((tx, i) => (
                                <tr key={i} style={{ borderBottom: i === recentTransactions.length - 1 ? 'none' : '1px solid #f8fafc' }}>
                                    <td style={{ padding: '16px 12px', fontWeight: 600 }}>{tx.type}</td>
                                    <td style={{ padding: '16px 12px' }}>{tx.operator}</td>
                                    <td style={{ padding: '16px 12px', fontWeight: 700 }}>{tx.amount} FCFA</td>
                                    <td style={{ padding: '16px 12px', color: '#64748b' }}>{tx.agent}</td>
                                    <td style={{ padding: '16px 12px' }}>
                                        <span style={{
                                            padding: '4px 10px', borderRadius: '100px', fontSize: '12px', fontWeight: 700,
                                            background: tx.status === 'Succès' ? '#ecfdf5' : '#fef9c3',
                                            color: tx.status === 'Succès' ? '#059669' : '#a16207'
                                        }}>{tx.status}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </main>
        </div>
    );
};
