import { useEffect, useState, useCallback } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { getUserProfile, UserProfile } from "../lib/users";

interface AuthState {
  session: Session | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isNewUser: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    session: null,
    profile: null,
    isLoading: true,
    isNewUser: false,
  });

  const loadProfile = useCallback(async (session: Session | null) => {
    if (!session) {
      setState({ session: null, profile: null, isLoading: false, isNewUser: false });
      return;
    }

    try {
      const profile = await getUserProfile(session.user.id);
      const isNewUser = !profile;
      setState({ session, profile, isLoading: false, isNewUser });
    } catch {
      setState({ session, profile: null, isLoading: false, isNewUser: true });
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      loadProfile(session);
    });

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const refreshProfile = async () => {
    if (state.session) {
      await loadProfile(state.session);
    }
  };

  return {
    ...state,
    signIn,
    signUp,
    signOut,
    refreshProfile,
  };
}
