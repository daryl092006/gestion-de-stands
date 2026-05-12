import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { api } from '../services/api';
import {
    Store,
    Smartphone,
    User,
    ArrowRight,
    ArrowLeft,
    CheckCircle2,
    Hash,
    Globe,
    Eye,
    EyeOff
} from 'lucide-react';

export const OwnerOnboarding: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
    const { countries, setSelectedCountry, selectedCountry, setCountries, user } = useAppStore();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPasswords, setShowPasswords] = useState<Record<number, boolean>>({});

    useEffect(() => {
        const loadCountries = async () => {
            try {
                const data = await api.countries.getAll();
                setCountries(data as any);
            } catch (err) {
                console.error("Error loading countries:", err);
            }
        };
        loadCountries();
    }, [setCountries]);

    const [formData, setFormData] = useState({
        numStands: 1,
        stands: [{
            nom: '',
            operators: [] as { id: number; number: string }[],
            hasAgent: false,
            agentName: '',
            agentLogin: '',
            agentPass: ''
        }]
    });

    const nextStep = () => setStep(step + 1);
    const prevStep = () => setStep(step - 1);

    const handleCountrySelect = (countryId: number) => {
        const country = countries.find(c => c.id === countryId) || null;
        setSelectedCountry(country);
    };

    const handleStandChange = (index: number, field: string, value: any) => {
        const newStands = [...formData.stands];
        (newStands[index] as any)[field] = value;
        setFormData({ ...formData, stands: newStands });
    };

    const toggleOperator = (standIndex: number, opId: number) => {
        const newStands = [...formData.stands];
        const ops = newStands[standIndex].operators;
        const exists = ops.find(o => o.id === opId);

        if (exists) {
            newStands[standIndex].operators = ops.filter(o => o.id !== opId);
        } else {
            newStands[standIndex].operators = [...ops, { id: opId, number: '' }];
        }
        setFormData({ ...formData, stands: newStands });
    };

    const handleOpNumberChange = (standIndex: number, opId: number, number: string) => {
        const newStands = [...formData.stands];
        const op = newStands[standIndex].operators.find(o => o.id === opId);
        if (op) {
            op.number = number;
            setFormData({ ...formData, stands: newStands });
        }
    };

    const adjustStandsCount = (count: number) => {
        const currentStands = [...formData.stands];
        if (count > currentStands.length) {
            for (let i = currentStands.length; i < count; i++) {
                currentStands.push({
                    nom: '',
                    operators: [],
                    hasAgent: false,
                    agentName: '',
                    agentLogin: '',
                    agentPass: ''
                });
            }
        } else {
            currentStands.splice(count);
        }
        setFormData({ ...formData, numStands: count, stands: currentStands });
    };

    const finishSetup = async () => {
        if (!user?.id) return;
        setLoading(true);
        setError('');

        try {
            // ✅ Étape 0 : Vérifier que le profil existe en base (clé étrangère)
            // Si l'inscription a eu un problème, le profil peut manquer
            const existingProfile = await api.profiles.getById(user.id);
            if (!existingProfile) {
                const { error: profileError } = await (await import('../lib/supabase')).supabase
                    .from('profiles')
                    .upsert({
                        id: user.id,
                        nom: user.nom || '',
                        prenom: user.prenom || '',
                        role: 'Proprietaire',
                        telephone: ''
                    });
                if (profileError) {
                    throw new Error(`Impossible de créer le profil : ${profileError.message}. Veuillez vous reconnecter.`);
                }
            }

            for (const standData of formData.stands) {
                const stand = await api.stands.create(standData.nom, user.id);
                if (stand && stand.id) {
                    // 1. Link Operators
                    for (const opData of standData.operators) {
                        await api.stands.linkOperator(stand.id, opData.id, opData.number);
                    }

                    // 2. Create Agent if details provided
                    if (standData.agentLogin && standData.agentPass) {
                        try {
                            const agentUser = await api.auth.createAgent(
                                standData.agentLogin,
                                standData.agentPass,
                                {
                                    nom: standData.agentName || 'Agent',
                                    prenom: standData.nom || 'Stand',
                                    telephone: ''
                                }
                            );

                            if (agentUser) {
                                await api.stands.affectAgent(stand.id, agentUser.id);
                            }
                        } catch (agentErr) {
                            console.error(`Failed to create agent for stand ${standData.nom}:`, agentErr);
                        }
                    }
                }
            }
            onComplete();
        } catch (err: any) {
            console.error("Setup error:", err);
            setError(err.message || "Une erreur est survenue lors de la configuration.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex-center" style={{ minHeight: '80vh', padding: '20px' }}>
            <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '900px', padding: '60px' }}>
                {error && (
                    <div style={{ padding: '16px', background: '#fef2f2', color: '#dc2626', borderRadius: '12px', marginBottom: '32px', border: '1px solid #fee2e2', fontWeight: 600 }}>
                        {error}
                    </div>
                )}

                {/* Étape 1 : Pays et Volume */}
                {step === 1 && (
                    <div className="animate-fade-in" style={{ textAlign: 'center' }}>
                        <div style={{ width: '90px', height: '90px', background: 'rgba(79, 70, 229, 0.05)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 32px' }}>
                            <Globe color="var(--primary)" size={44} />
                        </div>
                        <h2 style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', marginBottom: '12px' }}>Bienvenue sur votre Espace</h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '17px', marginBottom: '48px' }}>Pour finaliser la création de votre compte, configurez vos points de vente.</p>

                        <div style={{ marginBottom: '40px', textAlign: 'left' }}>
                            <label style={{ display: 'block', marginBottom: '10px', fontSize: '13px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Dans quel pays opérez-vous ?</label>
                            <select
                                style={{ width: '100%', height: '56px', paddingLeft: '16px' }}
                                value={selectedCountry?.id || ''}
                                onChange={e => handleCountrySelect(Number(e.target.value))}
                            >
                                <option value="">Choisissez votre pays</option>
                                {countries.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                            </select>
                        </div>

                        {selectedCountry && (
                            <div style={{ background: '#f8fafc', padding: '40px', borderRadius: '24px', marginBottom: '48px' }}>
                                <label style={{ display: 'block', marginBottom: '20px', fontSize: '13px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Combien de stands gérez-vous ?</label>
                                <input
                                    type="range" min="1" max="10" value={formData.numStands}
                                    onChange={e => adjustStandsCount(Number(e.target.value))}
                                    style={{ width: '100%', cursor: 'pointer', height: '8px', accentColor: 'var(--primary)', marginBottom: '32px' }}
                                />
                                <div style={{ fontSize: '64px', fontWeight: 900, color: 'var(--primary)', lineHeight: 1 }}>{formData.numStands}</div>
                            </div>
                        )}

                        <button className="btn-primary" style={{ width: '100%', height: '56px' }} onClick={nextStep} disabled={!selectedCountry}>
                            Configurer les stands <ArrowRight size={20} />
                        </button>
                    </div>
                )}

                {/* Étape 2 : Détails des stands */}
                {step === 2 && (
                    <div className="animate-fade-in">
                        <div style={{ marginBottom: '40px' }}>
                            <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', letterSpacing: '-1px', marginBottom: '10px' }}>Configuration des Opérateurs</h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>Associez les opérateurs Mobile Money à vos stands.</p>
                        </div>

                        <div style={{ maxHeight: '50vh', overflowY: 'auto', paddingRight: '15px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
                            {formData.stands.map((stand, standIdx) => (
                                <div key={standIdx} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '24px', padding: '32px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                                    <div style={{ marginBottom: '24px' }}>
                                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Nom du stand</label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ width: '36px', height: '36px', flexShrink: 0, background: '#f1f5f9', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Store size={18} color="var(--primary)" />
                                            </div>
                                            <input
                                                type="text"
                                                placeholder="Ex: Stand Cotonou Centre"
                                                value={stand.nom}
                                                onChange={e => handleStandChange(standIdx, 'nom', e.target.value)}
                                                style={{ flex: 1, height: '48px', fontWeight: 700, fontSize: '16px', paddingLeft: '16px', border: `1.5px solid ${!stand.nom ? '#f87171' : '#e2e8f0'}`, borderRadius: '12px', background: !stand.nom ? '#fff5f5' : '#f8fafc' }}
                                            />
                                        </div>
                                        {!stand.nom && <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '6px', fontWeight: 600 }}>⚠ Ce champ est requis</p>}
                                    </div>

                                    <p style={{ fontSize: '12px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '1px' }}>Services Disponibles</p>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '24px' }}>
                                        {selectedCountry?.operateur?.map(op => {
                                            const isSelected = stand.operators.find(o => o.id === op.id);
                                            return (
                                                <button
                                                    key={op.id}
                                                    type="button"
                                                    onClick={() => toggleOperator(standIdx, op.id)}
                                                    style={{
                                                        padding: '12px 20px', borderRadius: '14px', border: '1px solid',
                                                        borderColor: isSelected ? 'var(--primary)' : '#e2e8f0',
                                                        background: isSelected ? 'rgba(79, 70, 229, 0.05)' : 'white',
                                                        color: isSelected ? 'var(--primary)' : '#64748b',
                                                        fontWeight: 700, fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s',
                                                        display: 'flex', alignItems: 'center', gap: '10px'
                                                    }}
                                                >
                                                    <Smartphone size={16} /> {op.nom}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {stand.operators.length > 0 && (
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                                            {stand.operators.map(opObj => {
                                                const opProp = selectedCountry?.operateur?.find(o => o.id === opObj.id);
                                                return (
                                                    <div key={opObj.id}>
                                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>Numéro {opProp?.nom}</label>
                                                        <div style={{ position: 'relative' }}>
                                                            <Hash size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                                            <input
                                                                type="text"
                                                                placeholder="Numéro"
                                                                value={opObj.number}
                                                                onChange={e => handleOpNumberChange(standIdx, opObj.id, e.target.value)}
                                                                style={{ width: '100%', height: '44px', paddingLeft: '36px', fontSize: '14px' }}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div style={{ display: 'flex', gap: '20px', marginTop: '40px', flexDirection: 'column' }}>
                            {formData.stands.some(s => !s.nom || s.operators.length === 0) && (
                                <p style={{ color: '#ef4444', fontSize: '13px', fontWeight: 600, textAlign: 'center' }}>
                                    ⚠ Veuillez renseigner le nom et au moins un opérateur pour chaque stand.
                                </p>
                            )}
                            <div style={{ display: 'flex', gap: '20px' }}>
                                <button className="btn-secondary" style={{ flex: 1, height: '56px' }} onClick={prevStep}><ArrowLeft size={18} /> Retour</button>
                                <button className="btn-primary" style={{ flex: 2, height: '56px' }} onClick={nextStep} disabled={formData.stands.some(s => !s.nom || s.operators.length === 0)}>
                                    Suivant <ArrowRight size={20} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Étape 3 : Création des Agents */}
                {step === 3 && (
                    <div className="animate-fade-in">
                        <div style={{ marginBottom: '40px' }}>
                            <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', letterSpacing: '-1px', marginBottom: '10px' }}>Gestion de l'équipe (Optionnel)</h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>Créez les comptes pour vos agents sur le terrain.</p>
                        </div>

                        <div style={{ maxHeight: '50vh', overflowY: 'auto', paddingRight: '15px' }}>
                            {formData.stands.map((stand, idx) => (
                                <div key={idx} style={{ background: '#f8fafc', padding: '32px', borderRadius: '24px', marginBottom: '24px', border: '1px solid #e2e8f0' }}>
                                    <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', alignItems: 'center' }}>
                                        <div style={{ width: '40px', height: '40px', background: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <User size={20} color="var(--primary)" />
                                        </div>
                                        <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Agent pour {stand.nom}</h3>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 700, color: '#64748b' }}>Nom complet</label>
                                            <input type="text" placeholder="Nom de l'agent" value={stand.agentName} onChange={e => handleStandChange(idx, 'agentName', e.target.value)} autoComplete="off" style={{ width: '100%', height: '48px' }} />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 700, color: '#64748b' }}>Identifiant connexion</label>
                                            <input type="email" placeholder="Email de l'agent" value={stand.agentLogin} onChange={e => handleStandChange(idx, 'agentLogin', e.target.value)} autoComplete="off" style={{ width: '100%', height: '48px' }} />
                                        </div>
                                        <div style={{ gridColumn: 'span 2' }}>
                                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 700, color: '#64748b' }}>Code d'accès provisoire</label>
                                            <div style={{ position: 'relative' }}>
                                                <input
                                                    type={showPasswords[idx] ? "text" : "password"}
                                                    placeholder="Mot de passe (min 6 car.)"
                                                    value={stand.agentPass}
                                                    onChange={e => handleStandChange(idx, 'agentPass', e.target.value)}
                                                    autoComplete="new-password"
                                                    style={{ width: '100%', height: '48px', paddingRight: '48px' }}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPasswords(prev => ({ ...prev, [idx]: !prev[idx] }))}
                                                    style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '0', display: 'flex' }}
                                                >
                                                    {showPasswords[idx] ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div style={{ display: 'flex', gap: '20px', marginTop: '40px' }}>
                            <button className="btn-secondary" style={{ flex: 1, height: '56px' }} onClick={prevStep} disabled={loading}><ArrowLeft size={18} /> Retour</button>
                            <button className="btn-primary" style={{ flex: 2, height: '56px', gap: '12px' }} onClick={finishSetup} disabled={loading}>
                                {loading ? 'Configuration en cours...' : <><CheckCircle2 size={24} /> Terminer l'installation</>}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
