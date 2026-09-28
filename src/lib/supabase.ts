import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Subject = {
  id: string;
  name: string;
  created_at: string;
};

export type Subtopic = {
  id: string;
  subject_id: string;
  name: string;
  created_at: string;
};

export type Question = {
  id: string;
  subject_id: string;
  subtopic_id: string | null;
  question_text: string;
  option_a: string | null;
  option_b: string | null;
  option_c: string | null;
  option_d: string | null;
  option_e: string | null;
  answer: string | null;
  explanation: string | null;
  exam: string | null;
  year: number | null;
  is_important: boolean;
  image_url: string | null;
  option_a_image_url: string | null;
  option_b_image_url: string | null;
  option_c_image_url: string | null;
  option_d_image_url: string | null;
  option_e_image_url: string | null;
  created_at: string;
};
