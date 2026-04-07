import { create } from 'zustand';
import { FirebaseAuthTypes } from '@react-native-firebase/auth';

type FirebaseUser = FirebaseAuthTypes.User;

interface AuthState {
  user: FirebaseUser | null;
  loading: boolean;
  hasProfile: boolean | null;
  error: string | null;
  setUser: (user: FirebaseUser | null) => void;
  setLoading: (loading: boolean) => void;
  setHasProfile: (hasProfile: boolean | null) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  loading: true, // true on startup — we don't know login state yet
  hasProfile: null,
  error: null,

  setUser: (user) => set({ user, loading: false, error: null }),
  setLoading: (loading) => set({ loading }),
  setHasProfile: (hasProfile) => set({ hasProfile }),
  setError: (error) => set({ error, loading: false }),
  clearError: () => set({ error: null }),
}));