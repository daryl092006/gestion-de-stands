import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import { api, supabase } from '../services/api';
import { LogIn, Mail, Lock, Loader2, ArrowRight, Eye, EyeOff } from 'lucide-react';

export const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const { setUser } = useAppStore();
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const user = await api.auth.login(email, password);
            if (user) {
                let profile = await api.profiles.getById(user.id);

                // Sécurité : Si le profil manque en base, on le crée à la volée depuis les métadonnées
                if (!profile) {
                    const metadata = user.user_metadata || {};
                    await supabase.from('profiles').upsert({
                        id: user.id,
                        nom: metadata.nom || '',
                        prenom: metadata.prenom || '',
                        role: metadata.role || 'Proprietaire',
                        telephone: metadata.telephone || ''
                    });
                    profile = await api.profiles.getById(user.id);
                }

                if (profile) {
                    setUser({
                        id: user.id,
                        nom: profile.nom || '',
                        prenom: (profile.prenom && profile.prenom !== 'r') ? profile.prenom : (user.email?.split('@')[0] || 'Utilisateur'),
                        role: profile.role,
                        login: user.email || '',
                        must_change_password: profile.must_change_password,
                        is_suspended: profile.is_suspended
                    });
                    navigate('/config');
                } else {
                    // Fallback si vraiment le profil ne peut pas être récupéré
                    setUser({ ...user, prenom: 'Utilisateur', role: 'Proprietaire' } as any);
                    navigate('/config');
                }
            }
        } catch (err: any) {
            alert(err.message || "Erreur de connexion");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: '20px' }}>
            <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '400px', padding: '40px' }}>
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <div style={{ width: '60px', height: '60px', background: 'rgba(79, 70, 229, 0.1)', color: 'var(--primary)', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                        <LogIn size={28} />
                    </div>
                    <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a' }}>Bon retour !</h1>
                    <p style={{ color: '#64748b', marginTop: '8px' }}>Connectez-vous à votre espace</p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div className="input-group">
                        <label><Mail size={14} /> Email</label>
                        <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="votre@email.com" />
                    </div>

                    <div className="input-group">
                        <label><Lock size={14} /> Mot de passe</label>
                        <div style={{ position: 'relative' }}>
                            <input 
                                required 
                                type={showPassword ? "text" : "password"} 
                                value={password} 
                                onChange={e => setPassword(e.target.value)} 
                                placeholder="••••••••" 
                                style={{ width: '100%', paddingRight: '45px' }}
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

                    <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '10px', height: '52px', fontSize: '16px' }}>
                        {loading ? <Loader2 className="animate-spin" /> : <>Se connecter <ArrowRight size={18} style={{ marginLeft: '8px' }} /></>}
                    </button>
                </form>

                <p style={{ textAlign: 'center', marginTop: '32px', color: '#64748b', fontSize: '14px' }}>
                    Pas encore de compte ? <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}>Créer un compte</Link>
                </p>
            </div>
        </div>
    );
};
