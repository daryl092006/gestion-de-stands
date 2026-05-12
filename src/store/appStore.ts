import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface User {
  id: string;
  nom: string;
  prenom: string;
  role: 'Admin' | 'Agent' | 'Proprietaire' | 'authenticated';
  login: string;
  stand_id?: number;
  must_change_password?: boolean;
  is_suspended?: boolean;
}

export interface Country {
  id: number;
  nom: string;
  code_iso: string;
  operateur: {
    id: number;
    nom: string;
    code: string;
  }[];
}

export interface Stand {
  id: number;
  nom: string;
  localisation?: string;
  statut?: string;
}

interface JourneeOperateur {
  id?: number;
  id_journee?: number;
  id_operateur: number;
  nom_operateur?: string;
  solde_initial_electro_proprio: number;
  solde_initial_electro_agent?: number;
}

interface Journee {
  id: number;
  date_jour: string;
  solde_initial_cash_proprio: number;
  solde_initial_cash_agent?: number;
  id_stand: number;
  statut: 'Pre-ouverte' | 'Ouverte' | 'Clôturée';
  journee_operateur: JourneeOperateur[];
}

interface Transaction {
  id: number;
  id_journee: number;
  type: 'Dépôt' | 'Retrait' | 'Transfert' | 'Paiement';
  id_operateur: number;
  montant: number;
  date_heure: string;
  commentaire: string;
}

interface AppState {
  user: User | null;
  currentStand: Stand | null;          // ← Nouveau : stand actuellement actif
  currentJournee: Journee | null;
  transactions: Transaction[];
  operators: { id: number; nom: string; code: string }[];
  countries: Country[];
  selectedCountry: Country | null;

  setUser: (user: User | null) => void;
  setCurrentStand: (stand: Stand | null) => void;
  setJournee: (journee: Journee | null) => void;
  addTransaction: (tx: Transaction) => void;
  setTransactions: (txs: Transaction[]) => void;
  setCountries: (countries: Country[]) => void;
  setSelectedCountry: (country: Country | null) => void;
  setOperators: (operators: { id: number; nom: string; code: string }[]) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      currentStand: null,
      currentJournee: null,
      transactions: [],
      operators: [],
      countries: [],
      selectedCountry: null,

      setUser: (user) => set({ user }),
      setCurrentStand: (stand) => set({ currentStand: stand }),
      setJournee: (journee) => set({ currentJournee: journee }),
      addTransaction: (tx) => set((state) => ({ transactions: [tx, ...state.transactions] })),
      setTransactions: (transactions) => set({ transactions }),
      setCountries: (countries) => set({ countries }),
      setSelectedCountry: (selectedCountry) => set({ selectedCountry }),
      setOperators: (operators) => set({ operators }),
      logout: () => {
        set({
          user: null,
          currentStand: null,
          currentJournee: null,
          transactions: [],
          operators: [],
          countries: [],
          selectedCountry: null
        });
        localStorage.removeItem('app-storage');
      },
    }),
    {
      name: 'app-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
