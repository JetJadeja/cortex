import { useEffect, useState, useCallback, useRef } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { getProfile, Profile } from "../lib/profiles";

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  profileError: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    session: null,
    profile: null,
    isLoading: true,
    profileError: false,
  });

  const loadIdRef = useRef(0);

  const loadProfile = useCallback(async (session: Session | null) => {
    const thisLoadId = ++loadIdRef.current;

    if (!session) {
      setState({ session: null, profile: null, isLoading: false, profileError: false });
      return;
    }

    setState((prev) => ({ ...prev, session, isLoading: true, profileError: false }));

    try {
      const profile = await getProfile(session.user.id);
      if (loadIdRef.current !== thisLoadId) return;
      setState({ session, profile, isLoading: false, profileError: false });
    } catch {
      if (loadIdRef.current !== thisLoadId) return;
      setState({ session, profile: null, isLoading: false, profileError: true });
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      loadProfile(session);
    });

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;

    if (!data.session) {
      const isDuplicate = data.user?.identities?.length === 0;
      if (isDuplicate) {
        throw new Error("An account with this email already exists.");
      }
      throw new Error("Please check your email to confirm your account.");
    }
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

  const isNewUser = !!state.session && (!state.profile || !state.profile.display_name.trim());

  return {
    ...state,
    isNewUser,
    signIn,
    signUp,
    signOut,
    refreshProfile,
  };
}
