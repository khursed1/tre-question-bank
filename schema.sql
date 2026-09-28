-- Create subjects table
CREATE TABLE subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create subtopics table
CREATE TABLE subtopics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(subject_id, name)
);

-- Create questions table
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE NOT NULL,
  subtopic_id UUID REFERENCES subtopics(id) ON DELETE SET NULL,
  question_text TEXT NOT NULL,
  option_a TEXT,
  option_b TEXT,
  option_c TEXT,
  option_d TEXT,
  answer TEXT, -- 'A', 'B', 'C', 'D' or actual answer text
  explanation TEXT,
  exam TEXT,
  year INTEGER,
  is_important BOOLEAN DEFAULT false,
  image_url TEXT,
  option_a_image_url TEXT,
  option_b_image_url TEXT,
  option_c_image_url TEXT,
  option_d_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Setup RLS (Row Level Security) - simple anon access for now
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtopics ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on subjects" ON subjects FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on subjects" ON subjects FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on subjects" ON subjects FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access on subjects" ON subjects FOR DELETE USING (true);

CREATE POLICY "Allow public read access on subtopics" ON subtopics FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on subtopics" ON subtopics FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on subtopics" ON subtopics FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access on subtopics" ON subtopics FOR DELETE USING (true);

CREATE POLICY "Allow public read access on questions" ON questions FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on questions" ON questions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on questions" ON questions FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access on questions" ON questions FOR DELETE USING (true);

-- Create storage bucket for images
INSERT INTO storage.buckets (id, name, public) VALUES ('question_images', 'question_images', true);
CREATE POLICY "Allow public read access on storage" ON storage.objects FOR SELECT USING (bucket_id = 'question_images');
CREATE POLICY "Allow public insert access on storage" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'question_images');
CREATE POLICY "Allow public update access on storage" ON storage.objects FOR UPDATE USING (bucket_id = 'question_images');
CREATE POLICY "Allow public delete access on storage" ON storage.objects FOR DELETE USING (bucket_id = 'question_images');
