import { supabase } from "./supabase";

export interface ConceptLink {
  concept_id_1: string;
  concept_id_2: string;
  relationship_description: string;
  created_at: string;
}

export async function getLinksForConcept(conceptId: string): Promise<ConceptLink[]> {
  const { data, error } = await supabase
    .from("concept_links")
    .select("*")
    .or(`concept_id_1.eq.${conceptId},concept_id_2.eq.${conceptId}`)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function createConceptLink(
  conceptIdA: string,
  conceptIdB: string,
  relationshipDescription: string,
): Promise<ConceptLink> {
  const [concept_id_1, concept_id_2] =
    conceptIdA < conceptIdB ? [conceptIdA, conceptIdB] : [conceptIdB, conceptIdA];

  const { data, error } = await supabase
    .from("concept_links")
    .insert({ concept_id_1, concept_id_2, relationship_description: relationshipDescription })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteConceptLink(
  conceptIdA: string,
  conceptIdB: string,
): Promise<void> {
  const [concept_id_1, concept_id_2] =
    conceptIdA < conceptIdB ? [conceptIdA, conceptIdB] : [conceptIdB, conceptIdA];

  const { error } = await supabase
    .from("concept_links")
    .delete()
    .eq("concept_id_1", concept_id_1)
    .eq("concept_id_2", concept_id_2);

  if (error) throw error;
}
