import React, { useState } from 'react';
import { Coins, Save, RotateCcw } from 'lucide-react';

const COUPURES = [
    { val: 10000, type: 'billet' },
    { val: 5000, type: 'billet' },
    { val: 2000, type: 'billet' },
    { val: 1000, type: 'billet' },
    { val: 500, type: 'billet' },
    { val: 500, type: 'piece' },
    { val: 200, type: 'piece' },
    { val: 100, type: 'piece' },
    { val: 50, type: 'piece' },
    { val: 25, type: 'piece' },
    { val: 10, type: 'piece' },
    { val: 5, type: 'piece' },
];

interface CashCounterProps {
    onTotalChange?: (total: number) => void;
}

export const CashCounter: React.FC<CashCounterProps> = ({ onTotalChange }) => {
    const [counts, setCounts] = useState<{ [key: string]: number }>(
        COUPURES.reduce((acc, c) => ({ ...acc, [`${c.val}-${c.type}`]: 0 }), {})
    );

    const updateCounts = (newCounts: any) => {
        setCounts(newCounts);
        if (onTotalChange) {
            const newTotal = COUPURES.reduce((sum, c) => {
                const id = `${c.val}-${c.type}`;
                return sum + (c.val * newCounts[id]);
            }, 0);
            onTotalChange(newTotal);
        }
    };

    const handleIncrement = (id: string) => {
        updateCounts({ ...counts, [id]: counts[id] + 1 });
    };

    const handleDecrement = (id: string) => {
        updateCounts({ ...counts, [id]: Math.max(0, counts[id] - 1) });
    };

    const handleInputChange = (id: string, value: string) => {
        const n = parseInt(value) || 0;
        updateCounts({ ...counts, [id]: Math.max(0, n) });
    };

    const total = COUPURES.reduce((sum, c) => {
        const id = `${c.val}-${c.type}`;
        return sum + (c.val * counts[id]);
    }, 0);

    return (
        <div style={{ padding: '24px', background: '#f8fafc', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h3 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px', color: '#1e293b' }}>
                    <Coins color="var(--primary)" size={18} /> Détail du Comptage
                </h3>
                <div style={{ padding: '10px 20px', background: 'rgba(79, 70, 229, 0.05)', borderRadius: '12px', border: '1px solid rgba(79, 70, 229, 0.1)' }}>
                    <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Total: </span>
                    <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--primary)' }}>{total.toLocaleString()} F</span>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
                {COUPURES.map((c) => {
                    const id = `${c.val}-${c.type}`;
                    return (
                        <div key={id} style={{
                            padding: '16px',
                            background: 'white',
                            borderRadius: '16px',
                            border: '1px solid #e2e8f0',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '12px'
                        }}>
                            <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.5px' }}>{c.type === 'billet' ? 'Billet' : 'Pièce'} {c.val}</span>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <button
                                    type="button"
                                    onClick={() => handleDecrement(id)}
                                    style={{ width: '28px', height: '28px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                >-</button>
                                <input
                                    type="number"
                                    value={counts[id] || 0}
                                    onChange={(e) => handleInputChange(id, e.target.value)}
                                    style={{ width: '50px', textAlign: 'center', border: 'none', background: 'transparent', fontWeight: 700, fontSize: '16px', padding: 0 }}
                                />
                                <button
                                    type="button"
                                    onClick={() => handleIncrement(id)}
                                    style={{ width: '28px', height: '28px', borderRadius: '8px', border: 'none', background: 'var(--primary)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                >+</button>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
                <button
                    type="button"
                    className="btn-secondary"
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', height: '48px', fontSize: '14px' }}
                    onClick={() => setCounts(COUPURES.reduce((acc, c) => ({ ...acc, [`${c.val}-${c.type}`]: 0 }), {}))}
                >
                    <RotateCcw size={16} /> Réinitialiser
                </button>
            </div>
        </div>
    );
};
