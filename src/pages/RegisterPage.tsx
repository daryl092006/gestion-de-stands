import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { UserPlus, Mail, Lock, User, Phone, Loader2, ArrowRight, Eye, EyeOff } from 'lucide-react';

export const RegisterPage: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        nom: '',
        prenom: '',
        telephone: ''
    });
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.auth.register(formData.email, formData.password, {
                nom: formData.nom,
                prenom: formData.prenom,
                telephone: formData.telephone
            });
            navigate('/config');
        } catch (err: any) {
            alert(err.message || "Erreur lors de l'inscription");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: '20px' }}>
            <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '450px', padding: '40px' }}>
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <div style={{ width: '60px', height: '60px', background: 'rgba(79, 70, 229, 0.1)', color: 'var(--primary)', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                        <UserPlus size={28} />
                    </div>
                    <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a' }}>Créer un compte</h1>
                    <p style={{ color: '#64748b', marginTop: '8px' }}>Propriétaire de stand</p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div className="input-group">
                            <label><User size={14} /> Prénom</label>
                            <input required value={formData.prenom} onChange={e => setFormData({ ...formData, prenom: e.target.value })} placeholder="Jean" />
                        </div>
                        <div className="input-group">
                            <label><User size={14} /> Nom</label>
                            <input required value={formData.nom} onChange={e => setFormData({ ...formData, nom: e.target.value })} placeholder="Dupont" />
                        </div>
                    </div>

                    <div className="input-group">
                        <label><Phone size={14} /> Téléphone</label>
                        <input value={formData.telephone} onChange={e => setFormData({ ...formData, telephone: e.target.value })} placeholder="+225 ..." />
                    </div>

                    <div className="input-group">
                        <label><Mail size={14} /> Email professionnel</label>
                        <input required type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="contact@entreprise.com" />
                    </div>

                    <div className="input-group">
                        <label><Lock size={14} /> Mot de passe</label>
                        <div style={{ position: 'relative' }}>
                            <input 
                                required 
                                type={showPassword ? "text" : "password"} 
                                value={formData.password} 
                                onChange={e => setFormData({ ...formData, password: e.target.value })} 
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

                    <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '12px', height: '52px', fontSize: '16px' }}>
                        {loading ? <Loader2 className="animate-spin" /> : <>Créer mon compte <ArrowRight size={18} style={{ marginLeft: '8px' }} /></>}
                    </button>
                </form>

                <p style={{ textAlign: 'center', marginTop: '24px', color: '#64748b', fontSize: '14px' }}>
                    Déjà inscrit ? <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}>Se connecter</Link>
                </p>
            </div>
        </div>
    );
};
