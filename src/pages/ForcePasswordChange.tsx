import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import { supabase } from '../lib/supabase';
import { Lock, ShieldCheck, AlertCircle, Loader2, ArrowRight, Eye, EyeOff } from 'lucide-react';

export const ForcePasswordChange: React.FC = () => {
    const { user, setUser } = useAppStore();
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password.length < 6) {
            setError('Le mot de passe doit contenir au moins 6 caractères.');
            return;
        }
        if (password !== confirm) {
            setError('Les mots de passe ne correspondent pas.');
            return;
        }

        setLoading(true);
        try {
            // 1. Mettre à jour le mot de passe dans Supabase Auth
            const { error: authErr } = await supabase.auth.updateUser({
                password: password
            });
            if (authErr) throw authErr;

            // 2. Mettre à jour le drapeau must_change_password dans profiles
            const { error: profileErr } = await supabase
                .from('profiles')
                .update({ must_change_password: false })
                .eq('id', user?.id);
            if (profileErr) throw profileErr;

            // 3. Mettre à jour le store local
            if (user) {
                setUser({ ...user, must_change_password: false });
            }

            setSuccess(true);
            setTimeout(() => {
                navigate('/');
            }, 2000);
        } catch (err: any) {
            console.error('Password update error:', err);
            setError(err.message || 'Une erreur est survenue lors du changement.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="flex-center" style={{ minHeight: '80vh' }}>
                <div className="glass-card animate-scale-in" style={{ maxWidth: '450px', padding: '60px', textAlign: 'center' }}>
                    <div style={{ width: '80px', height: '80px', background: '#ecfdf5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 32px' }}>
                        <ShieldCheck size={40} color="#10b981" />
                    </div>
                    <h2 style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', marginBottom: '12px' }}>Mot de passe sécurisé !</h2>
                    <p style={{ color: '#64748b', fontSize: '16px', lineHeight: 1.6 }}>
                        Votre compte est désormais sécurisé. Redirection vers votre dashboard...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-center" style={{ minHeight: '80vh', padding: '20px' }}>
            <div className="glass-card animate-fade-in" style={{ maxWidth: '500px', width: '100%', padding: '48px' }}>
                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                    <div style={{ width: '64px', height: '64px', background: 'rgba(79, 70, 229, 0.05)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                        <Lock size={32} color="var(--primary)" />
                    </div>
                    <h2 style={{ fontSize: '28px', fontWeight: 900, color: '#0f172a', marginBottom: '12px', letterSpacing: '-0.5px' }}>
                        Sécurisez votre compte
                    </h2>
                    <p style={{ color: '#64748b', fontSize: '15px', lineHeight: 1.6 }}>
                        C'est votre première connexion. Pour protéger vos opérations, vous devez définir un mot de passe personnel.
                    </p>
                </div>

                {error && (
                    <div style={{ padding: '14px 18px', background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '12px', color: '#dc2626', fontSize: '14px', fontWeight: 600, display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '24px' }}>
                        <AlertCircle size={18} /> {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                            Nouveau mot de passe
                        </label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="Au moins 6 caractères"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                style={{ width: '100%', height: '52px', paddingLeft: '48px', paddingRight: '45px' }}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: 'absolute',
                                    right: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: '#94a3b8',
                                    padding: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                            Confirmer le mot de passe
                        </label>
                        <div style={{ position: 'relative' }}>
                            <ShieldCheck size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input
                                type={showConfirm ? "text" : "password"}
                                placeholder="Confirmez votre secret"
                                value={confirm}
                                onChange={e => setConfirm(e.target.value)}
                                style={{ width: '100%', height: '52px', paddingLeft: '48px', paddingRight: '45px' }}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirm(!showConfirm)}
                                style={{
                                    position: 'absolute',
                                    right: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: '#94a3b8',
                                    padding: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn-primary"
                        disabled={loading}
                        style={{ height: '56px', fontSize: '16px', marginTop: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px' }}
                    >
                        {loading ? (
                            <>
                                <Loader2 size={20} className="animate-spin" /> Mise à jour...
                            </>
                        ) : (
                            <>
                                Enregistrer mon secret <ArrowRight size={20} />
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};
