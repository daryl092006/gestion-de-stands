import { createClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export { supabase };

export const api = {
    auth: {
        async login(email: string, pass: string) {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
            if (error) throw error;
            return data.user;
        },
        async register(email: string, pass: string, profile: { nom: string, prenom: string, telephone?: string }) {
            const { data, error } = await supabase.auth.signUp({
                email,
                password: pass,
                options: {
                    data: {
                        nom: profile.nom,
                        prenom: profile.prenom,
                        telephone: profile.telephone || '',
                        role: 'Proprietaire'
                    }
                }
            });
            if (error) throw error;
            
            if (data.user) {
                const { error: pError } = await supabase.from('profiles').insert({
                    id: data.user.id,
                    nom: profile.nom,
                    prenom: profile.prenom,
                    telephone: profile.telephone || '',
                    role: 'Proprietaire'
                });
                if (pError) console.error("Could not create profile row:", pError);
            }

            return data.user;
        },
        async createAgent(email: string, pass: string, profile: { nom: string, prenom: string, telephone?: string }) {
            const tempSupabase = createClient(supabaseUrl, supabaseAnonKey, {
                auth: { persistSession: false }
            });
            const { data: authData, error: authError } = await tempSupabase.auth.signUp({
                email,
                password: pass,
                options: {
                    data: {
                        nom: profile.nom,
                        prenom: profile.prenom,
                        telephone: profile.telephone || '',
                        role: 'Agent'
                    }
                }
            });
            if (authError) throw authError;
            
            if (authData.user) {
                const { error: pError } = await supabase.from('profiles').insert({
                    id: authData.user.id,
                    nom: profile.nom,
                    prenom: profile.prenom,
                    telephone: profile.telephone || '',
                    role: 'Agent',
                    must_change_password: true
                });
                if (pError) console.error("Could not create agent profile row:", pError);
            }

            return authData.user;
        },
        async logout() {
            await supabase.auth.signOut();
        },
        async resetAgentPassword(agentId: string, newPass: string) {
            // Dans un environnement Supabase standard, un admin peut utiliser supabase.auth.admin.updateUserById
            // Ici, on va simplement forcer le must_change_password et on suppose que l'admin a les droits.
            // Note: Pour vraiment changer le mdp sans être l'utilisateur, il faut le service_role key.
            // On va au moins mettre à jour le profil.
            const { error } = await supabase.from('profiles').update({ 
                must_change_password: true 
            }).eq('id', agentId);
            if (error) throw error;
            
            // Pour le vrai changement de mdp Auth, on utilise un hack ou on redirige vers une fonction Edge.
            // Pour l'instant, on fait ce qui est possible côté client.
        }
    },

    profiles: {
        async getById(id: string) {
            const { data, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
            if (error) throw error;
            return data;
        },
        async getAgents(_ownerId: string) {
            const { data, error } = await supabase.from('profiles').select('*').eq('role', 'Agent');
            if (error) throw error;
            return data;
        },
        async suspend(id: string) {
            const { error } = await supabase.from('profiles').update({ is_suspended: true }).eq('id', id);
            if (error) throw error;
        },
        async reactivate(id: string) {
            const { error } = await supabase.from('profiles').update({ is_suspended: false }).eq('id', id);
            if (error) throw error;
        }
    },

    stands: {
        async getAllByOwner(ownerId: string) {
            const { data, error } = await supabase
                .from('stand')
                .select(`*, stand_operateur(*, operateur(*)), affectation_agent(*, profiles:id_agent(*))`)
                .eq('id_proprietaire', ownerId);
            if (error) throw error;
            return data;
        },
        async getByOwner(ownerId: string) { return this.getAllByOwner(ownerId); },
        async getByAgent(agentId: string) {
            const { data, error } = await supabase
                .from('stand')
                .select(`*, stand_operateur(*, operateur(*)), affectation_agent!inner(*)`)
                .eq('affectation_agent.id_agent', agentId);
            if (error) throw error;
            return data;
        },
        async getOperators(standId: number) {
            const { data, error } = await supabase
                .from('stand_operateur')
                .select('*, operateur(*)')
                .eq('id_stand', standId);
            if (error) throw error;
            return data;
        },
        async create(nom: string, ownerId: string, loc: string = '') {
            const { data, error } = await supabase.from('stand').insert({ nom, id_proprietaire: ownerId, localisation: loc }).select().single();
            if (error) throw error;
            return data;
        },
        async createFull(nom: string, ownerId: string, loc: string, ops: any[], agentId: string) {
            const stand = await this.create(nom, ownerId, loc);
            const promises = ops.map(op => this.linkOperator(stand.id, op.id, op.number));
            if (agentId) promises.push(this.affectAgent(stand.id, agentId));
            await Promise.all(promises);
            return stand;
        },
        async linkOperator(standId: number, opId: number, number: string) {
            const { error } = await supabase.from('stand_operateur').insert({ id_stand: standId, id_operateur: opId, numero_compte: number });
            if (error) throw error;
        },
        async affectAgent(standId: number, agentId: string) {
            const { error } = await supabase.from('affectation_agent').insert({ id_stand: standId, id_agent: agentId });
            if (error) throw error;
        },
        async updateName(standId: number, nom: string) {
            const { error } = await supabase.from('stand').update({ nom }).eq('id', standId);
            if (error) throw error;
        }
    },

    sessions: {
        async getActiveForOwner(ownerId: string) {
            const { data, error } = await supabase.from('journee').select('*, stand(*), journee_operateur(*, operateur(*))').eq('id_proprietaire', ownerId).in('statut', ['Pre-ouverte', 'Ouverte']);
            if (error) throw error;
            return data;
        },
        async getRecentClosedForOwner(ownerId: string) {
            const { data, error } = await supabase.from('journee').select('*, stand(*)').eq('id_proprietaire', ownerId).eq('statut', 'Clôturée').order('date_jour', { ascending: false }).limit(5);
            if (error) throw error;
            return data;
        },
        async getActiveForAgent(agentId: string) {
            const { data: stands } = await supabase.from('affectation_agent').select('id_stand').eq('id_agent', agentId);
            const standIds = stands?.map(s => s.id_stand) || [];
            if (standIds.length === 0) return [];
            const { data, error } = await supabase.from('journee').select('*, stand(*), journee_operateur(*, operateur(*))').in('id_stand', standIds).in('statut', ['Pre-ouverte', 'Ouverte']);
            if (error) throw error;
            return data;
        },
        async getStandCurrentSession(standId: number) {
            const { data, error } = await supabase.from('journee').select('*, journee_operateur(*, operateur(*))').eq('id_stand', standId).in('statut', ['Pre-ouverte', 'Ouverte']).order('created_at', { ascending: false }).limit(1).maybeSingle();
            if (error) throw error;
            return data;
        },
        async preOpen(journeeData: any, operatorsData: any[]) {
            const { data: journee, error: jErr } = await supabase.from('journee').insert(journeeData).select().single();
            if (jErr) throw jErr;
            const promises = operatorsData.map(op => supabase.from('journee_operateur').insert({ ...op, id_journee: journee.id }));
            await Promise.all(promises);
            return journee;
        },
        async confirmOpening(journeeId: number, agentData: any, operatorsAgentData: any[]) {
            const { error: jErr } = await supabase.from('journee').update({ ...agentData, statut: 'Ouverte' }).eq('id', journeeId);
            if (jErr) throw jErr;
            for (const op of operatorsAgentData) {
                await supabase.from('journee_operateur').update({ solde_initial_electro_agent: op.solde_initial_electro_agent }).eq('id_journee', journeeId).eq('id_operateur', op.id_operateur);
            }
        },
        async submitClosing(journeeId: number, data: any) {
            const { error: jErr } = await supabase.from('journee').update({ solde_final_cash: data.cash_final, statut: 'Clôturée' }).eq('id', journeeId);
            if (jErr) throw jErr;
            for (const op of data.operators) {
                await supabase.from('journee_operateur').update({ solde_final_electro: op.solde_final_electro }).eq('id_journee', journeeId).eq('id_operateur', op.id_operateur);
            }
        },
        async close(id: number) {
            const { error } = await supabase.from('journee').update({ statut: 'Clôturée' }).eq('id', id);
            if (error) throw error;
        }
    },

    transactions: {
        async getBySession(journeeId: number) {
            const { data, error } = await supabase.from('transaction').select('*').eq('id_journee', journeeId).order('date_heure', { ascending: false });
            if (error) throw error;
            return data;
        },
        async create(tx: any) {
            const { data, error } = await supabase.from('transaction').insert(tx).select().single();
            if (error) throw error;
            return data;
        }
    },

    operations: {
        async getActiveJournee(standId: number) {
            const { data, error } = await supabase.from('journee').select('*, journee_operateur(*, operateur(*))').eq('id_stand', standId).eq('statut', 'Ouverte').maybeSingle();
            if (error) throw error;
            return data;
        },
        async ouvrirJournee(payload: { standId: number, agentId: string, cashOwner: number, cashAgent: number, balances: any[] }) {
            const { data: journee, error: jErr } = await supabase.from('journee').insert({
                id_stand: payload.standId,
                id_agent: payload.agentId,
                solde_initial_cash_proprio: payload.cashOwner,
                solde_initial_cash_agent: payload.cashAgent,
                statut: 'Ouverte'
            }).select().single();

            if (jErr) throw jErr;

            if (payload.balances && payload.balances.length > 0) {
                const bPromises = payload.balances.map(b =>
                    supabase.from('journee_operateur').insert({
                        id_journee: journee.id,
                        id_operateur: b.id_operateur,
                        solde_initial_electro_proprio: b.propre || 0,
                        solde_initial_electro_agent: b.agent || 0
                    })
                );
                await Promise.all(bPromises);
            }
            return journee;
        },
        async createTransaction(tx: {
            journeeId: number, opId: number, type: string, montant: number,
            client?: string, reseau?: string, comm?: number
        }) {
            const { data, error } = await supabase.from('transaction').insert({
                id_journee: tx.journeeId,
                id_operateur: tx.opId,
                type: tx.type,
                montant: tx.montant,
                client: tx.client,
                commentaire: `Réf: ${tx.reseau}${tx.comm ? ` | Comm: ${tx.comm}` : ''}`
            }).select().single();

            if (error) throw error;
            return data;
        }
    },

    countries: {
        async getAll() {
            const { data, error } = await supabase.from('pays').select('*, operateur(*)');
            if (error) throw error;
            return data;
        }
    }
};
