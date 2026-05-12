import { supabase } from '../lib/supabase';

export const dataService = {
    // Fetch countries and their operators
    async getCountries() {
        const { data, error } = await supabase
            .from('pays')
            .select(`
        id,
        nom,
        code_iso,
        operateur (
          id,
          nom,
          code
        )
      `);

        if (error) throw error;
        return data;
    },

    // Get profile of the current user
    async getProfile(userId: string) {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) throw error;
        return data;
    },

    // Get all stands for an owner
    async getOwnerStands(ownerId: string) {
        const { data, error } = await supabase
            .from('stand')
            .select('*')
            .eq('id_proprietaire', ownerId);

        if (error) throw error;
        return data;
    },

    // Get all stands assigned to an agent
    async getAgentStands(agentId: string) {
        const { data, error } = await supabase
            .from('affectationagent')
            .select(`
                stand (*)
            `)
            .eq('id_agent', agentId);

        if (error) throw error;
        return data ? data.map(item => item.stand) : [];
    },

    // Get ALL active/pre-open sessions for a proprietor (all stands at once)
    async getOwnerActiveSessions(ownerId: string) {
        const { data, error } = await supabase
            .from('journee')
            .select(`
                *,
                stand (id, nom, localisation),
                journeeoperateur (*)
            `)
            .eq('id_proprietaire', ownerId)
            .in('statut', ['Pre-ouverte', 'Ouverte'])
            .order('date_jour', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    // Get ALL active/pre-open sessions for an agent (across assigned stands)
    async getAgentActiveSessions(agentId: string) {
        // First get agent's stand IDs
        const { data: assignments, error: aErr } = await supabase
            .from('affectationagent')
            .select('id_stand')
            .eq('id_agent', agentId);

        if (aErr) throw aErr;
        const standIds = assignments?.map(a => a.id_stand) || [];
        if (standIds.length === 0) return [];

        const { data, error } = await supabase
            .from('journee')
            .select(`
                *,
                stand (id, nom, localisation),
                journeeoperateur (*)
            `)
            .in('id_stand', standIds)
            .in('statut', ['Pre-ouverte', 'Ouverte'])
            .order('date_jour', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    // Get operators for a specific stand (with their account numbers)
    async getStandOperators(standId: number) {
        const { data, error } = await supabase
            .from('standoperateur')
            .select(`
                id_operateur,
                numero_compte,
                operateur (
                    id,
                    nom,
                    code
                )
            `)
            .eq('id_stand', standId);

        if (error) throw error;
        return data;
    },

    // Get active journée for a stand
    async getActiveJournee(standId: number) {
        const { data, error } = await supabase
            .from('journee')
            .select(`
        *,
        journeeoperateur (
          *
        )
      `)
            .eq('id_stand', standId)
            .eq('statut', 'Ouverte')
            .single();

        if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows returned"
        return data;
    },

    // Fetch transactions for a journée
    async getTransactions(journeeId: number) {
        const { data, error } = await supabase
            .from('transaction')
            .select('*')
            .eq('id_journee', journeeId)
            .order('date_heure', { ascending: false });

        if (error) throw error;
        return data;
    },

    // Create a new stand
    async createStand(nom: string, proprietaireId: string) {
        const { data, error } = await supabase
            .from('stand')
            .insert({ nom, id_proprietaire: proprietaireId })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    // Update stand name
    async updateStandName(standId: number, newNom: string) {
        const { error } = await supabase
            .from('stand')
            .update({ nom: newNom })
            .eq('id', standId);
        if (error) throw error;
    },

    // Link an operator to a stand with a specific account number
    async createStandOperateur(standId: number, operateurId: number, numeroCompte: string) {
        const { error } = await supabase
            .from('standoperateur')
            .insert({
                id_stand: standId,
                id_operateur: operateurId,
                numero_compte: numeroCompte
            });
        if (error) throw error;
    },

    // SESSION MANAGEMENT (JOURNEE)

    // Check if there is any active or pre-opened session for a stand
    async getStandSession(standId: number) {
        const { data, error } = await supabase
            .from('journee')
            .select(`
                *,
                journeeoperateur (*)
            `)
            .eq('id_stand', standId)
            .in('statut', ['Pre-ouverte', 'Ouverte'])
            .order('date_jour', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) throw error;
        return data;
    },

    // Step 1: Proprietor Pre-opens a session
    async preOpenJournee(journeeData: any, operatorsData: any[]) {
        // 1. Create Journee
        const { data: journee, error: jError } = await supabase
            .from('journee')
            .insert(journeeData)
            .select()
            .single();

        if (jError) throw jError;

        // 2. Create JourneeOperateur entries
        const opsToInsert = operatorsData.map(op => ({
            ...op,
            id_journee: journee.id
        }));

        const { error: opError } = await supabase
            .from('journeeoperateur')
            .insert(opsToInsert);

        if (opError) throw opError;

        return { ...journee, journeeoperateur: operatorsData };
    },

    // Step 2: Agent confirms the session
    async confirmJourneeOpening(journeeId: number, agentData: any, operatorsAgentData: { id_operateur: number, solde_initial_electro_agent: number }[]) {
        // 1. Update main journee
        const { error: jError } = await supabase
            .from('journee')
            .update({
                ...agentData,
                statut: 'Ouverte'
            })
            .eq('id', journeeId);

        if (jError) throw jError;

        // 2. Update each operator balance for the agent
        for (const op of operatorsAgentData) {
            const { error: opError } = await supabase
                .from('journeeoperateur')
                .update({ solde_initial_electro_agent: op.solde_initial_electro_agent })
                .eq('id_journee', journeeId)
                .eq('id_operateur', op.id_operateur);

            if (opError) throw opError;
        }
    },

    // Close session
    async closeJournee(journeeId: number) {
        const { error } = await supabase
            .from('journee')
            .update({ statut: 'Clôturée' })
            .eq('id', journeeId);
        if (error) throw error;
    }
};
