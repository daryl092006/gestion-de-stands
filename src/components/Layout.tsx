import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import { authService } from '../services/authService';
import {
    LayoutDashboard,
    PlusCircle,
    LogOut,
    Calendar,
    Wallet,
    Settings,
    ChevronRight
} from 'lucide-react';

interface LayoutProps {
    children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
    const { user, logout, currentJournee } = useAppStore();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = async () => {
        try {
            await authService.logout();
            logout();
            navigate('/login');
        } catch (err) {
            console.error("Logout error:", err);
        }
    };

    const navItems = [
        { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={20} /> },
        { name: 'Transactions', path: '/transactions', icon: <PlusCircle size={20} /> },
        { name: 'Ma Journée', path: '/journee', icon: <Calendar size={20} /> },
    ];

    if (user?.role === 'Admin' || user?.role === 'Proprietaire') {
        navItems.push({ name: 'Stands & Config', path: '/config', icon: <Settings size={20} /> });
    }

    const getPageTitle = () => {
        const item = navItems.find(i => i.path === location.pathname);
        return item ? item.name : 'M-Money Manager';
    };

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-light)' }}>
            {/* Sidebar */}
            <aside
                style={{
                    width: '280px',
                    background: 'var(--bg-white)',
                    display: 'flex',
                    flexDirection: 'column',
                    borderRight: '1px solid var(--glass-border)',
                    position: 'sticky',
                    top: 0,
                    height: '100vh'
                }}
            >
                {/* Brand */}
                <div style={{ padding: '32px 24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 4px 10px rgba(79, 70, 229, 0.2)'
                    }}>
                        <Wallet color="white" size={22} />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.5px' }}>STAND MANAGER</h1>
                        <p style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>Point de Vente</p>
                    </div>
                </div>

                {/* Navigation Items */}
                <nav style={{ flex: 1, padding: '0 16px' }}>
                    <p style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', padding: '0 12px 12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Menu Principal</p>
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => `sidebar-link ${isActive ? 'active-nav' : ''}`}
                            style={{
                                textDecoration: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                transition: 'all 0.2s',
                                marginBottom: '4px'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                {item.icon}
                                <span style={{ fontSize: '15px' }}>{item.name}</span>
                            </div>
                            {location.pathname === item.path && <ChevronRight size={14} />}
                        </NavLink>
                    ))}
                </nav>

                {/* User Section */}
                <div style={{ padding: '24px', borderTop: '1px solid #f1f5f9' }}>
                    <div style={{
                        background: '#f8fafc',
                        padding: '16px',
                        borderRadius: '16px',
                        marginBottom: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                    }}>
                        <div style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '50%',
                            background: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                            fontWeight: 700,
                            color: 'var(--primary)'
                        }}>
                            {(user?.prenom?.[0] || user?.login?.[0] || '?').toUpperCase()}
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                            <p style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {user?.prenom && user.prenom !== 'r' ? user.prenom : (user?.login?.split('@')[0] || 'Propriétaire')}
                            </p>
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>
                                {user?.role === 'authenticated' ? 'Synchronisation...' : 
                                 user?.role === 'Proprietaire' ? 'Propriétaire' : 
                                 user?.role || '—'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            padding: '12px',
                            borderRadius: '12px',
                            background: 'transparent',
                            color: 'var(--danger)',
                            fontSize: '14px',
                            fontWeight: 600,
                            border: '1px solid #fee2e2',
                            transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = '#fef2f2'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                        <LogOut size={16} />
                        <span>Déconnexion</span>
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main style={{ flex: 1, overflowY: 'auto' }}>
                <header style={{
                    background: 'var(--bg-white)',
                    height: '80px',
                    padding: '0 40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid #e2e8f0',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)',
                    position: 'sticky',
                    top: 0,
                    zIndex: 100
                }}>
                    <div>
                        <h2 style={{ fontSize: '20px', fontWeight: 700 }}>{getPageTitle()}</h2>
                    </div>

                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '14px' }}>
                                {(user?.prenom?.[0] || user?.login?.[0] || '?').toUpperCase()}
                            </div>
                            <div className="hidden-mobile" style={{ textAlign: 'right' }}>
                                <p style={{ fontSize: '14px', fontWeight: 800, color: '#1e293b', marginBottom: '2px' }}>
                                    {user?.prenom && user?.nom ? `${user.prenom} ${user.nom}` : user?.login?.split('@')[0]}
                                </p>
                                <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    {user?.role === 'Proprietaire' ? 'Propriétaire' : user?.role || 'Utilisateur'}
                                </p>
                            </div>
                        </div>
                        {currentJournee ? (
                            <div style={{
                                padding: '8px 16px',
                                background: 'rgba(16, 185, 129, 0.08)',
                                border: '1px solid rgba(16, 185, 129, 0.2)',
                                borderRadius: '30px',
                                color: '#059669',
                                fontSize: '13px',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', animation: 'pulse 2s infinite' }} />
                                SERVICE ACTIF
                            </div>
                        ) : (
                            <div style={{
                                padding: '8px 16px',
                                background: '#fef2f2',
                                border: '1px solid #fee2e2',
                                borderRadius: '30px',
                                color: '#dc2626',
                                fontSize: '13px',
                                fontWeight: 700
                            }}>
                                SERVICE À OUVRIR
                            </div>
                        )}
                        <style>{`
                            @keyframes pulse {
                                0% { opacity: 1; }
                                50% { opacity: 0.4; }
                                100% { opacity: 1; }
                            }
                        `}</style>
                    </div>
                </header>

                <div style={{ padding: '40px' }}>
                    {children}
                </div>
            </main>
        </div>
    );
};
