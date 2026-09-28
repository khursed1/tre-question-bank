import { Client } from 'pg';

const connectionString = 'postgresql://postgres:Noornissa%401992@db.thxxwmcllcvvpeysqzar.supabase.co:5432/postgres';

async function checkStorage() {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    
    // Check if the bucket exists and is public
    const bucketRes = await client.query(`SELECT id, name, public FROM storage.buckets WHERE id = 'question_images'`);
    console.log("Bucket:", bucketRes.rows);

    // Drop all existing policies for this bucket to be safe
    console.log("Resetting policies...");
    await client.query(`
      DROP POLICY IF EXISTS "Allow public read access on storage" ON storage.objects;
      DROP POLICY IF EXISTS "Allow public insert access on storage" ON storage.objects;
      DROP POLICY IF EXISTS "Allow public update access on storage" ON storage.objects;
      DROP POLICY IF EXISTS "Allow public delete access on storage" ON storage.objects;

      CREATE POLICY "public_read" ON storage.objects FOR SELECT USING (bucket_id = 'question_images');
      CREATE POLICY "public_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'question_images');
      CREATE POLICY "public_update" ON storage.objects FOR UPDATE USING (bucket_id = 'question_images');
      CREATE POLICY "public_delete" ON storage.objects FOR DELETE USING (bucket_id = 'question_images');
    `);
    
    // See if any files were uploaded
    const filesRes = await client.query(`SELECT name, bucket_id FROM storage.objects WHERE bucket_id = 'question_images' LIMIT 5`);
    console.log("Files found in bucket:", filesRes.rows);
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

checkStorage();
