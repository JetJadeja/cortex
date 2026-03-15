import { createClient } from "@supabase/supabase-js";
import { config } from "../constants/config";

export const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);
