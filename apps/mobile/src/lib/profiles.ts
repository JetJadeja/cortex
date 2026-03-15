import { supabase } from "./supabase";

export interface Profile {
  user_id: string;
  display_name: string;
  age: number | null;
  preferences: Record<string, unknown>;
  created_at: string;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }

  return data;
}

export async function createProfile(
  userId: string,
  displayName: string,
  age: number | null,
): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .insert({ user_id: userId, display_name: displayName, age })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateProfile(
  userId: string,
  updates: { display_name?: string; age?: number | null; preferences?: Record<string, unknown> },
): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
