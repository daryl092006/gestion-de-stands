import { supabase } from '../lib/supabase';

export const authService = {
    async login(email: string, pass: string) {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password: pass,
        });
        if (error) throw error;
        return data;
    },

    async register(email: string, pass: string, profile: { nom: string, prenom: string, role: string, telephone: string }) {
        // 1. Sign up user
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password: pass,
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error("Registration failed");

        // 2. Create profile
        const { error: profileError } = await supabase
            .from('profiles')
            .insert({
                id: authData.user.id,
                nom: profile.nom,
                prenom: profile.prenom,
                role: profile.role,
                telephone: profile.telephone
            });

        if (profileError) throw profileError;
        return authData;
    },

    async logout() {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    },

    async getCurrentUser() {
        const { data: { user } } = await supabase.auth.getUser();
        return user;
    }
};
