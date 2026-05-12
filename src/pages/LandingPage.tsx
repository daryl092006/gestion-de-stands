import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Wallet, Shield, Smartphone, ArrowRight, BarChart3,
    CheckCircle2, Users, Bell, Zap, Menu, X, Landmark,
    SmartphoneNfc, Receipt, History
} from 'lucide-react';

export const LandingPage: React.FC = () => {
    const navigate = useNavigate();
    const [isScrolled, setIsScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div style={{
            fontFamily: "'Outfit', 'Inter', sans-serif",
            backgroundColor: '#fdfdfd',
            color: '#0f172a',
            overflowX: 'hidden'
        }}>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
        
        .nav-link {
          font-weight: 500;
          color: #1e293b;
          text-decoration: none;
          transition: color 0.2s;
          cursor: pointer;
        }
        .nav-link:hover { color: #4f46e5; }
        
        .btn-primary {
          background-color: #4f46e5;
          color: white;
          padding: 12px 24px;
          border-radius: 10px;
          font-weight: 600;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);
        }
        .btn-primary:hover {
          background-color: #4338ca;
          transform: translateY(-1px);
          box-shadow: 0 10px 15px -3px rgba(79, 70, 229, 0.3);
        }
        
        .btn-outline {
          background: white;
          color: #0f172a;
          padding: 12px 24px;
          border-radius: 10px;
          font-weight: 600;
          border: 1px solid #e2e8f0;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-outline:hover {
          background-color: #f8fafc;
          border-color: #cbd5e1;
        }

        .hero-title {
          font-size: clamp(40px, 6vw, 72px);
          line-height: 1.1;
          font-weight: 800;
          letter-spacing: -2px;
          background: linear-gradient(to bottom right, #0f172a, #334155);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 24px;
        }

        .mockup-container {
          position: relative;
          max-width: 1100px;
          margin: 0 auto;
          background: #ffffff;
          border-radius: 20px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
          border: 1px solid #f1f5f9;
          overflow: hidden;
          transform: perspective(1000px) rotateX(5deg);
        }

        .feature-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 32px;
          padding: 80px 0;
        }

        .feature-card {
          padding: 40px;
          border-radius: 24px;
          background: #ffffff;
          border: 1px solid #f1f5f9;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .feature-card:hover {
          border-color: #e2e8f0;
          background: #fcfcfc;
          transform: translateY(-4px);
        }

        .operator-badge {
          padding: 10px 20px;
          background: #f1f5f9;
          border-radius: 100px;
          font-weight: 700;
          font-size: 14px;
          color: #1e293b;
          display: flex;
          align-items: center;
          gap: 8px;
          border: 1px solid #cbd5e1;
        }

        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
          100% { transform: translateY(0px); }
        }
      `}</style>

            {/* Navigation */}
            <nav style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 1000,
                padding: isScrolled ? '12px 24px' : '18px 24px',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(10px)',
                borderBottom: '1px solid #e2e8f0',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                        width: '32px',
                        height: '32px',
                        background: '#4f46e5',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Wallet size={18} color="white" />
                    </div>
                    <span style={{ fontWeight: 800, fontSize: '20px', letterSpacing: '-0.5px' }}>STAND MANAGER</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
                    <div style={{ display: 'flex', gap: '24px' }}>
                        <span className="nav-link" onClick={() => document.getElementById('operators')?.scrollIntoView({ behavior: 'smooth' })}>Opérateurs</span>
                        <span className="nav-link" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>Fonctions</span>
                        <span className="nav-link">Tarifs</span>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button className="btn-outline" onClick={() => navigate('/login')}>Connexion</button>
                        <button className="btn-primary" onClick={() => navigate('/register')}>Essai gratuit</button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section style={{
                padding: '160px 24px 100px',
                textAlign: 'center',
                position: 'relative'
            }}>
                {/* Sub-tag */}
                <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 16px',
                    backgroundColor: '#eff6ff',
                    color: '#3b82f6',
                    borderRadius: '100px',
                    fontSize: '14px',
                    fontWeight: 600,
                    marginBottom: '24px'
                }}>
                    <Zap size={14} fill="#3b82f6" /> Le futur de la gestion Mobile Money
                </div>

                <h1 className="hero-title">
                    Reprenez le contrôle total<br />
                    de vos points de vente.
                </h1>

                <p style={{
                    fontSize: '20px',
                    color: '#334155',
                    maxWidth: '800px',
                    margin: '0 auto 48px',
                    lineHeight: 1.6,
                    fontWeight: 500
                }}>
                    Une application métier robuste pour sécuriser vos cash-flows, supprimer la fraude
                    et digitaliser la gestion journalière de vos stands Mobile Money.
                </p>

                <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginBottom: '80px' }}>
                    <button className="btn-primary" style={{ padding: '16px 32px', fontSize: '18px' }} onClick={() => navigate('/register')}>
                        Commencer maintenant <ArrowRight size={20} style={{ marginLeft: '8px' }} />
                    </button>
                    <button className="btn-outline" style={{ padding: '16px 32px', fontSize: '18px' }} onClick={() => navigate('/demo')}>
                        Voir la démo
                    </button>
                </div>

            </section>


            {/* Trust/Operators Section */}
            <section id="operators" style={{ padding: '60px 24px', backgroundColor: '#fcfcfc', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9' }}>

                <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                    <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '14px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '32px' }}>
                        Compatible avec tous les opérateurs de la zone UEMOA
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
                        <div className="operator-badge"><Landmark size={18} /> MTN MoMo</div>
                        <div className="operator-badge"><Smartphone size={18} /> Moov Africa</div>
                        <div className="operator-badge"><SmartphoneNfc size={18} /> Wave</div>
                        <div className="operator-badge"><History size={18} /> TMoney</div>
                        <div className="operator-badge"><Zap size={18} /> Orange Money</div>
                    </div>
                </div>
            </section>

            {/* Technical Features Section */}
            <section id="features" style={{ padding: '100px 24px', maxWidth: '1200px', margin: '0 auto' }}>

                <div style={{ textAlign: 'center', marginBottom: '64px' }}>
                    <h2 style={{ fontSize: '40px', fontWeight: 800, letterSpacing: '-1px', marginBottom: '16px' }}>Une gestion professionnelle, enfin.</h2>
                    <p style={{ color: '#64748b', fontSize: '18px', maxWidth: '600px', margin: '0 auto' }}>Conçu pour résoudre les problèmes réels des gérants de stands : fraude, erreurs de caisse et manque de visibilité.</p>
                </div>

                <div className="feature-grid">
                    <div className="feature-card">
                        <div style={{ width: '48px', height: '48px', background: '#eff6ff', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
                            <Shield color="#3b82f6" size={24} />
                        </div>
                        <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>Audit de clôture journalier</h3>
                        <p style={{ color: '#64748b', lineHeight: 1.5 }}>Comparez automatiquement vos transactions électroniques avec le cash en main. Identifiez instantanément chaque franc manquant.</p>
                    </div>

                    <div className="feature-card">
                        <div style={{ width: '48px', height: '48px', background: '#fef2f2', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
                            <Users color="#ef4444" size={24} />
                        </div>
                        <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>Gestion Multi-Agents</h3>
                        <p style={{ color: '#64748b', lineHeight: 1.5 }}>Créez des accès sécurisés pour vos agents sur le terrain. Suivez leurs performances et gérez les changements de personnel facilement.</p>
                    </div>

                    <div className="feature-card">
                        <div style={{ width: '48px', height: '48px', background: '#f0fdf4', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
                            <BarChart3 color="#22c55e" size={24} />
                        </div>
                        <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>Historique & Statistiques</h3>
                        <p style={{ color: '#64748b', lineHeight: 1.5 }}>Visualisez l'évolution de vos bénéfices, identifiez vos points de vente les plus rentables et optimisez vos stocks de cash.</p>
                    </div>

                    <div className="feature-card">
                        <div style={{ width: '48px', height: '48px', background: '#fff7ed', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
                            <Receipt color="#f97316" size={24} />
                        </div>
                        <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>Gestion des Commissions</h3>
                        <p style={{ color: '#64748b', lineHeight: 1.5 }}>Suivez précisément vos commissions par opérateur pour une comptabilité sans faille à la fin de chaque mois.</p>
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section style={{ padding: '100px 24px', textAlign: 'center' }}>
                <div style={{
                    maxWidth: '1000px',
                    margin: '0 auto',
                    background: 'linear-gradient(135deg, #0f172a, #1e1b4b)',
                    borderRadius: '32px',
                    padding: '80px 40px',
                    color: 'white',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    {/* Decors */}
                    <div style={{ position: 'absolute', top: '-100px', right: '-100px', width: '300px', height: '300px', background: '#4f46e5', borderRadius: '50%', filter: 'blur(100px)', opacity: 0.2 }} />

                    <h2 style={{ fontSize: '40px', fontWeight: 800, marginBottom: '24px', letterSpacing: '-1.5px', color: 'white' }}>
                        Prêt à professionnaliser votre business ?
                    </h2>
                    <p style={{ fontSize: '18px', color: '#cbd5e1', maxWidth: '600px', margin: '0 auto 40px', lineHeight: 1.6, fontWeight: 500 }}>
                        Rejoignez des centaines de propriétaires de stands qui utilisent STAND MANAGER pour sécuriser leurs revenus.
                    </p>
                    <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button className="btn-primary" style={{ padding: '16px 40px', fontSize: '18px', background: 'white', color: '#0f172a' }} onClick={() => navigate('/register')}>
                            Créer un compte gratuitement
                        </button>
                        <button className="btn-outline" style={{ padding: '16px 40px', fontSize: '18px', background: 'transparent', color: 'white', borderColor: 'rgba(255,255,255,0.2)' }}>
                            Parler à un expert
                        </button>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer style={{ padding: '80px 24px 40px', background: '#0f172a', color: 'white' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '48px', marginBottom: '80px' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                            <div style={{ width: '28px', height: '28px', background: '#4f46e5', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Wallet size={16} color="white" />
                            </div>
                            <span style={{ fontWeight: 800, fontSize: '18px' }}>STAND MANAGER</span>
                        </div>
                        <p style={{ color: '#94a3b8', lineHeight: 1.6, fontSize: '15px' }}>La solution logicielle numéro 1 pour les points de vente Mobile Money en Afrique de l'Ouest.</p>
                    </div>
                    <div>
                        <h4 style={{ fontWeight: 700, marginBottom: '20px', fontSize: '16px' }}>Produit</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', color: '#94a3b8', fontSize: '14px' }}>
                            <span style={{ cursor: 'pointer' }} onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>Fonctionnalités</span>
                            <span style={{ cursor: 'pointer' }} onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>Sécurité</span>
                            <span style={{ cursor: 'pointer' }}>Tarifs</span>
                            <span style={{ cursor: 'pointer' }} onClick={() => document.getElementById('operators')?.scrollIntoView({ behavior: 'smooth' })}>Opérateurs</span>
                        </div>
                    </div>
                    <div>
                        <h4 style={{ fontWeight: 700, marginBottom: '20px', fontSize: '16px' }}>Compte</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', color: '#94a3b8', fontSize: '14px' }}>
                            <span style={{ cursor: 'pointer' }} onClick={() => navigate('/login')}>Connexion</span>
                            <span style={{ cursor: 'pointer' }} onClick={() => navigate('/register')}>Inscription</span>
                            <span style={{ cursor: 'pointer' }} onClick={() => navigate('/demo')}>Mode Démo</span>
                        </div>
                    </div>
                    <div>
                        <h4 style={{ fontWeight: 700, marginBottom: '20px', fontSize: '16px' }}>Support</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', color: '#94a3b8', fontSize: '14px' }}>
                            <span style={{ cursor: 'pointer' }}>Aide en ligne</span>
                            <span style={{ cursor: 'pointer' }}>Contact</span>
                            <span style={{ cursor: 'pointer' }}>Statut</span>
                        </div>
                    </div>
                </div>
                <div style={{ maxWidth: '1200px', margin: '0 auto', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '40px', display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '13px' }}>
                    <span>© 2024 Stand Manager SARL. Tous droits réservés.</span>
                    <div style={{ display: 'flex', gap: '24px' }}>
                        <span style={{ cursor: 'pointer' }}>CGU</span>
                        <span style={{ cursor: 'pointer' }}>Confidentialité</span>
                    </div>
                </div>
            </footer>
        </div>
    );
};

