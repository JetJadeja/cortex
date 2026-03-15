import { supabase } from "./supabase";

export type ProcessingStatus = "pending" | "complete" | "failed";

export interface Session {
  id: string;
  user_id: string;
  transcript: string;
  processing_status: ProcessingStatus;
  created_at: string;
}

export async function createSession(
  userId: string,
  transcript: string,
): Promise<Session> {
  const { data, error } = await supabase
    .from("sessions")
    .insert({ user_id: userId, transcript })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getSession(sessionId: string): Promise<Session | null> {
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }

  return data;
}

export async function getSessions(userId: string): Promise<Session[]> {
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function updateSessionStatus(
  sessionId: string,
  status: ProcessingStatus,
): Promise<Session> {
  const { data, error } = await supabase
    .from("sessions")
    .update({ processing_status: status })
    .eq("id", sessionId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
