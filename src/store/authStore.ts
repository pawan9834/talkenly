import { create } from 'zustand';
import { FirebaseAuthTypes } from '@react-native-firebase/auth';

type FirebaseUser = FirebaseAuthTypes.User;

interface AuthState {
  user: FirebaseUser | null;
  loading: boolean;
  error: string | null;
  setUser: (user: FirebaseUser | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  loading: true, // true on startup — we don't know login state yet
  error: null,

  setUser: (user) => set({ user, loading: false, error: null }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error, loading: false }),
  clearError: () => set({ error: null }),
}));