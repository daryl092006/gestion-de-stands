import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { api, supabase } from '../services/api';
import {
    Users, Store, Smartphone, Plus, RefreshCw,
    Loader2, User, MapPin, LayoutDashboard, Calendar, History, Wallet, ArrowUpRight, ArrowDownLeft, Eye, EyeOff
} from 'lucide-react';

export const ConfigPage: React.FC = () => {
    const { user } = useAppStore();
    const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'day' | 'config' | 'agents'>('dashboard');
    const [refreshing, setRefreshing] = useState(false);
    const [stands, setStands] = useState<any[]>([]);
    const [agents, setAgents] = useState<any[]>([]);
    const [isCreatingAgent, setIsCreatingAgent] = useState(false);
    const [newAgent, setNewAgent] = useState({ nom: '', prenom: '', email: '', password: '', telephone: '' });
    const [countries, setCountries] = useState<any[]>([]);
    const [activeJournee, setActiveJournee] = useState<any>(null);

    // Modals
    const [isCreatingStand, setIsCreatingStand] = useState(false);
    const [editingStand, setEditingStand] = useState<any>(null);
    const [showAgentPassword, setShowAgentPassword] = useState(false);

    // Form states
    const [newStandName, setNewStandName] = useState('');
    const [standLocation, setStandLocation] = useState('');
    const [selectedOps, setSelectedOps] = useState<{ id: number, number: string }[]>([]);
    const [selectedAgentId, setSelectedAgentId] = useState('');

    // Transaction Form (Diagramme: Transaction)
    const [txForm, setTxForm] = useState({ opId: '', type: 'Dépôt', montant: '', client: '', reseau: '', comm: '' });

    const loadData = async () => {
        if (!user?.id) return;
        setRefreshing(true);
        try {
            let standsData = [];
            let agentsData = [];
            
            if (user.role === 'Proprietaire') {
                [standsData, agentsData] = await Promise.all([
                    api.stands.getAllByOwner(user.id),
                    api.profiles.getAgents(user.id)
                ]);
            } else {
                // Pour un agent, on récupère ses stands affectés
                standsData = await api.stands.getByAgent(user.id);
            }

            setStands(standsData || []);
            setAgents(agentsData || []);
            
            const { data: countriesData } = await supabase.from('pays').select('*, operateur(*)');
            setCountries(countriesData || []);

            // Auto-chargement de la journée pour le premier stand (surtout utile pour l'agent)
            if (standsData?.[0]) {
                const j = await api.operations.getActiveJournee(standsData[0].id);
                setActiveJournee(j);
            }
        } catch (err) { 
            console.error(err); 
        } finally { 
            setRefreshing(false); 
        }
    };

    useEffect(() => { loadData(); }, [user?.id]);

    const handleCreateStand = async () => {
        if (!user?.id || !newStandName) return;
        try {
            await api.stands.createFull(newStandName, user.id, standLocation, selectedOps, selectedAgentId);
            setIsCreatingStand(false);
            loadData();
        } catch (err) { alert("Erreur."); }
    };

    const NavItem = ({ id, icon: Icon, label }: { id: any, icon: any, label: string }) => (
        <button
            onClick={() => setActiveTab(id)}
            style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '12px',
                background: activeTab === id ? 'var(--primary)' : 'transparent',
                color: activeTab === id ? 'white' : '#64748b',
                border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '14px'
            }}
        >
            <Icon size={18} />
            <span className="hidden-mobile">{label}</span>
        </button>
    );

    const [openDayForm, setOpenDayForm] = useState({ cashPropre: '', cashAgent: '', balances: [] as any[] });

    const handleOpenDay = async (standId: number) => {
        if (!user?.id) return;
        try {
            await api.operations.ouvrirJournee({
                standId,
                agentId: user.id,
                cashOwner: parseFloat(openDayForm.cashPropre) || 0,
                cashAgent: parseFloat(openDayForm.cashAgent) || 0,
                balances: openDayForm.balances
            });
            loadData();
        } catch (err) { alert("Erreur lors de l'ouverture."); }
    };

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px', paddingBottom: '100px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', background: 'white', padding: '10px', borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', gap: '5px' }}>
                    <NavItem id="dashboard" icon={LayoutDashboard} label="Dashboard" />
                    <NavItem id="transactions" icon={Smartphone} label="Transactions" />
                    <NavItem id="day" icon={Calendar} label="Ma Journée" />
                    <NavItem id="agents" icon={Users} label="Agents" />
                    <NavItem id="config" icon={Store} label="Stands" />
                </div>
                <button onClick={loadData} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                    <RefreshCw size={20} className={refreshing ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* ONGLET MA JOURNÉE (Conforme au Diagramme Classe: Journee & JourneeOperateur) */}
            {activeTab === 'day' && (
                <div className="animate-fade-in">
                    {!activeJournee ? (
                        <div className="glass-card" style={{ padding: '30px', maxWidth: '600px', margin: '0 auto' }}>
                            <h2 style={{ fontSize: '22px', fontWeight: 900, marginBottom: '25px', textAlign: 'center' }}>Ouverture de Session</h2>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '25px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>Cash Initial (Patron)</label>
                                    <input type="number" value={openDayForm.cashPropre} onChange={e => setOpenDayForm({ ...openDayForm, cashPropre: e.target.value })} placeholder="FCFA" style={{ width: '100%', height: '48px', padding: '0 15px', borderRadius: '12px', border: '1.5px solid #e2e8f0' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>Cash Initial (Agent)</label>
                                    <input type="number" value={openDayForm.cashAgent} onChange={e => setOpenDayForm({ ...openDayForm, cashAgent: e.target.value })} placeholder="FCFA" style={{ width: '100%', height: '48px', padding: '0 15px', borderRadius: '12px', border: '1.5px solid #e2e8f0' }} />
                                </div>
                            </div>

                            <p style={{ fontSize: '13px', fontWeight: 800, marginBottom: '15px', color: 'var(--primary)' }}>Balances Électroniques Initiales</p>
                            {stands[0]?.stand_operateur?.map((so: any) => {
                                const b = openDayForm.balances.find(x => x.id_operateur === so.id_operateur);
                                return (
                                    <div key={so.id_operateur} style={{ padding: '15px', background: '#f8fafc', borderRadius: '16px', marginBottom: '10px' }}>
                                        <p style={{ fontWeight: 800, fontSize: '13px', marginBottom: '10px' }}>{so.operateur?.nom}</p>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                            <input
                                                type="number"
                                                placeholder="Part Patron"
                                                onChange={e => {
                                                    const val = parseFloat(e.target.value) || 0;
                                                    setOpenDayForm(prev => {
                                                        const others = prev.balances.filter(x => x.id_operateur !== so.id_operateur);
                                                        return { ...prev, balances: [...others, { ...b, id_operateur: so.id_operateur, propre: val }] };
                                                    });
                                                }}
                                                style={{ width: '100%', height: '40px', padding: '0 10px', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '12px' }}
                                            />
                                            <input
                                                type="number"
                                                placeholder="Part Agent"
                                                onChange={e => {
                                                    const val = parseFloat(e.target.value) || 0;
                                                    setOpenDayForm(prev => {
                                                        const others = prev.balances.filter(x => x.id_operateur !== so.id_operateur);
                                                        return { ...prev, balances: [...others, { ...b, id_operateur: so.id_operateur, agent: val }] };
                                                    });
                                                }}
                                                style={{ width: '100%', height: '40px', padding: '0 10px', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '12px' }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}

                            <button onClick={() => handleOpenDay(stands[0].id)} className="btn-primary" style={{ width: '100%', height: '55px', marginTop: '20px', fontSize: '16px' }}>Ouvrir la Journée</button>
                        </div>
                    ) : (
                        <div className="glass-card" style={{ padding: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h2 style={{ fontSize: '20px', fontWeight: 900 }}>Session Active</h2>
                                    <p style={{ fontSize: '13px', color: '#64748b' }}>Ouvert le {new Date(activeJournee.created_at).toLocaleString()}</p>
                                </div>
                                <div style={{ padding: '8px 16px', background: '#ecfdf5', color: '#10b981', borderRadius: '12px', fontWeight: 800 }}>OUVERT</div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* DASHBOARD TAB */}
            {activeTab === 'dashboard' && (
                <div className="animate-fade-in">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                        <div className="glass-card" style={{ padding: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                                <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '10px', borderRadius: '12px' }}><Wallet size={20} /></div>
                                <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 700 }}>+12%</span>
                            </div>
                            <p style={{ color: '#64748b', fontSize: '14px' }}>Commissions estimées</p>
                            <h2 style={{ fontSize: '28px', fontWeight: 900 }}>0 FCFA</h2>
                        </div>
                        <div className="glass-card" style={{ padding: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                                <div style={{ background: 'rgba(79, 70, 229, 0.1)', color: 'var(--primary)', padding: '10px', borderRadius: '12px' }}><History size={20} /></div>
                                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 700 }}>Auj.</span>
                            </div>
                            <p style={{ color: '#64748b', fontSize: '14px' }}>Volume Transactions</p>
                            <h2 style={{ fontSize: '28px', fontWeight: 900 }}>0</h2>
                        </div>
                    </div>
                </div>
            )}

            {/* TRANSACTIONS TAB (Conforme à la classe Transaction du diagramme) */}
            {activeTab === 'transactions' && (
                <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: 'minmax(350px, 1fr) 2fr', gap: '24px' }}>
                    <div className="glass-card" style={{ padding: '24px' }}>
                        <h3 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: 800 }}>Nouvelle Transaction</h3>
                        {!activeJournee ? (
                            <div style={{ textAlign: 'center', padding: '40px 0' }}>
                                <p style={{ color: '#ef4444', fontWeight: 700 }}>Ouvrez la journée d'abord !</p>
                                <button onClick={() => setActiveTab('day')} className="btn-primary" style={{ marginTop: '15px' }}>Ouvrir la journée</button>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#64748b', marginBottom: '5px' }}>OPÉRATEUR</label>
                                    <select
                                        value={txForm.opId}
                                        onChange={e => setTxForm({ ...txForm, opId: e.target.value })}
                                        style={{ width: '100%', height: '48px', padding: '0 15px', borderRadius: '12px', border: '1.5px solid #e2e8f0', background: 'white' }}
                                    >
                                        <option value="">Sélectionner...</option>
                                        {activeJournee.journee_operateur?.map((jo: any) => (
                                            <option key={jo.id_operateur} value={jo.id_operateur}>{jo.operateur?.nom}</option>
                                        ))}
                                    </select>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#64748b', marginBottom: '5px' }}>TYPE</label>
                                        <select value={txForm.type} onChange={e => setTxForm({ ...txForm, type: e.target.value })} style={{ width: '100%', height: '48px', padding: '0 15px', borderRadius: '12px', border: '1.5px solid #e2e8f0', background: 'white' }}>
                                            <option value="Dépôt">Dépôt</option>
                                            <option value="Retrait">Retrait</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#64748b', marginBottom: '5px' }}>MONTANT</label>
                                        <input type="number" value={txForm.montant} onChange={e => setTxForm({ ...txForm, montant: e.target.value })} placeholder="0.00" style={{ width: '100%', height: '48px', padding: '0 15px', borderRadius: '12px', border: '1.5px solid #e2e8f0' }} />
                                    </div>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#64748b', marginBottom: '5px' }}>ID RÉSEAU / TRANSACTION</label>
                                    <input value={txForm.reseau} onChange={e => setTxForm({ ...txForm, reseau: e.target.value })} placeholder="Ex: 29384723" style={{ width: '100%', height: '48px', padding: '0 15px', borderRadius: '12px', border: '1.5px solid #e2e8f0' }} />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#64748b', marginBottom: '5px' }}>N° CLIENT</label>
                                    <input value={txForm.client} onChange={e => setTxForm({ ...txForm, client: e.target.value })} placeholder="0102030405" style={{ width: '100%', height: '48px', padding: '0 15px', borderRadius: '12px', border: '1.5px solid #e2e8f0' }} />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#64748b', marginBottom: '5px' }}>COMMISSION ESTIMÉE</label>
                                    <input type="number" value={txForm.comm} onChange={e => setTxForm({ ...txForm, comm: e.target.value })} placeholder="FCFA" style={{ width: '100%', height: '48px', padding: '0 15px', borderRadius: '12px', border: '1.5px solid #e2e8f0' }} />
                                </div>

                                <button
                                    onClick={async () => {
                                        try {
                                            await api.operations.createTransaction({
                                                journeeId: activeJournee.id,
                                                opId: parseInt(txForm.opId),
                                                type: txForm.type,
                                                montant: parseFloat(txForm.montant),
                                                client: txForm.client,
                                                reseau: txForm.reseau,
                                                comm: parseFloat(txForm.comm) || 0
                                            });
                                            setTxForm({ opId: '', type: 'Dépôt', montant: '', client: '', reseau: '', comm: '' });
                                            loadData();
                                        } catch (err) { alert("Erreur."); }
                                    }}
                                    className="btn-primary"
                                    style={{ width: '100%', height: '52px', marginTop: '10px' }}
                                >
                                    Valider Transaction
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="glass-card" style={{ padding: '24px', overflowY: 'auto', maxHeight: '600px' }}>
                        <h3 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: 800 }}>Historique Session</h3>
                        <div style={{ color: '#64748b', fontSize: '13px' }}>
                            Les transactions apparaîtront ici dès leur validation.
                        </div>
                    </div>
                </div>
            )}

            {/* CONFIG AGENTS */}
            {activeTab === 'agents' && (
                <div className="animate-fade-in">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <h2 style={{ fontSize: '20px', fontWeight: 900 }}>Vos Agents</h2>
                        <button onClick={() => setIsCreatingAgent(true)} className="btn-primary">+ Ajouter un Agent</button>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                        {agents.map(agent => (
                            <div key={agent.id} className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <div style={{ width: '50px', height: '50px', background: '#f1f5f9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                                    <User size={24} />
                                </div>
                                <div>
                                    <p style={{ fontWeight: 800, fontSize: '16px' }}>{agent.prenom} {agent.nom}</p>
                                    <p style={{ fontSize: '12px', color: '#64748b' }}>{agent.login}</p>
                                </div>
                            </div>
                        ))}
                        {agents.length === 0 && (
                            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#94a3b8', fontStyle: 'italic' }}>
                                Aucun agent trouvé. Cliquez sur "+ Ajouter un Agent" pour commencer.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* CONFIG STANDS */}
            {activeTab === 'config' && (
                <div className="animate-fade-in">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <h2 style={{ fontSize: '20px', fontWeight: 900 }}>Vos Points de Vente</h2>
                        <button onClick={() => setIsCreatingStand(true)} className="btn-primary">+ Nouveau Stand</button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
                        {stands.map(stand => (
                            <div key={stand.id} className="glass-card" style={{ padding: '24px', borderRadius: '24px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '20px' }}>
                                    <div>
                                        <h3 style={{ fontSize: '18px', fontWeight: 800 }}>{stand.nom}</h3>
                                        <p style={{ fontSize: '13px', color: '#64748b' }}>{stand.localisation || 'Non définie'}</p>
                                    </div>
                                    <div style={{ width: '40px', height: '40px', background: 'rgba(79, 70, 229, 0.1)', color: 'var(--primary)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Store size={20} /></div>
                                </div>
                                <div style={{ padding: '15px', background: '#f8fafc', borderRadius: '16px', marginBottom: '20px' }}>
                                    <p style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', marginBottom: '8px' }}>RÉSEAUX ACTIFS</p>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                        {stand.stand_operateur?.map((so: any) => (
                                            <span key={so.id} style={{ fontSize: '10px', fontWeight: 800, background: 'white', padding: '4px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>{so.operateur?.nom}</span>
                                        ))}
                                        {(!stand.stand_operateur || stand.stand_operateur.length === 0) && <span style={{ fontSize: '10px', color: '#94a3b8' }}>Aucun réseau</span>}
                                    </div>
                                </div>
                                <button className="btn-secondary" style={{ width: '100%' }} onClick={() => setEditingStand(stand)}>Paramètres Stand</button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* MODALE CRÉATION AGENT */}
            {isCreatingAgent && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="glass-card" style={{ padding: '30px', width: '90%', maxWidth: '450px' }}>
                        <h3 style={{ marginBottom: '20px', fontWeight: 900 }}>Recruter un Agent</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                            <input value={newAgent.prenom} onChange={e => setNewAgent({...newAgent, prenom: e.target.value})} placeholder="Prénom" style={{ height: '45px', padding: '0 15px', borderRadius: '10px', border: '1.5px solid #e2e8f0' }} />
                            <input value={newAgent.nom} onChange={e => setNewAgent({...newAgent, nom: e.target.value})} placeholder="Nom" style={{ height: '45px', padding: '0 15px', borderRadius: '10px', border: '1.5px solid #e2e8f0' }} />
                        </div>
                        <input value={newAgent.email} onChange={e => setNewAgent({...newAgent, email: e.target.value})} placeholder="Email (Identifiant)" style={{ width: '100%', marginBottom: '10px', height: '45px', padding: '0 15px', borderRadius: '10px', border: '1.5px solid #e2e8f0' }} />
                        <div style={{ position: 'relative', marginBottom: '10px' }}>
                            <input 
                                type={showAgentPassword ? "text" : "password"} 
                                value={newAgent.password} 
                                onChange={e => setNewAgent({...newAgent, password: e.target.value})} 
                                placeholder="Mot de passe provisoire" 
                                style={{ width: '100%', height: '45px', padding: '0 15px', paddingRight: '45px', borderRadius: '10px', border: '1.5px solid #e2e8f0' }} 
                            />
                            <button
                                type="button"
                                onClick={() => setShowAgentPassword(!showAgentPassword)}
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
                                {showAgentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        <input value={newAgent.telephone} onChange={e => setNewAgent({...newAgent, telephone: e.target.value})} placeholder="Téléphone" style={{ width: '100%', marginBottom: '20px', height: '45px', padding: '0 15px', borderRadius: '10px', border: '1.5px solid #e2e8f0' }} />
                        
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={() => setIsCreatingAgent(false)} className="btn-secondary" style={{ flex: 1 }}>Annuler</button>
                            <button 
                                onClick={async () => {
                                    try {
                                        await api.auth.createAgent(newAgent.email, newAgent.password, { nom: newAgent.nom, prenom: newAgent.prenom, telephone: newAgent.telephone });
                                        setIsCreatingAgent(false);
                                        loadData();
                                        alert("Agent créé avec succès !");
                                    } catch (err: any) { 
                                        alert("Erreur : " + (err.message || "Impossible de créer l'agent")); 
                                    }
                                }} 
                                className="btn-primary" 
                                style={{ flex: 1 }}
                            >
                                Créer l'Agent
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODALE CRÉATION STAND (Fidèle à la classe Stand) */}
            {isCreatingStand && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: 'white', padding: '30px', borderRadius: '24px', width: '90%', maxWidth: '450px' }}>
                        <h3 style={{ marginBottom: '20px', fontWeight: 800 }}>Ajouter un Stand</h3>
                        <input value={newStandName} onChange={e => setNewStandName(e.target.value)} placeholder="Nom du stand" style={{ width: '100%', marginBottom: '15px', height: '45px', padding: '0 15px', borderRadius: '10px', border: '1.5px solid #e2e8f0' }} />
                        <input value={standLocation} onChange={e => setStandLocation(e.target.value)} placeholder="Adresse / Localisation" style={{ width: '100%', marginBottom: '20px', height: '45px', padding: '0 15px', borderRadius: '10px', border: '1.5px solid #e2e8f0' }} />
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={() => setIsCreatingStand(false)} className="btn-secondary" style={{ flex: 1 }}>Annuler</button>
                            <button onClick={handleCreateStand} className="btn-primary" style={{ flex: 1 }}>Créer le stand</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
