import dotenv from 'dotenv';
import { getSupabase } from '../lib/supabase';

dotenv.config();

async function test() {
    const { data, error } = await getSupabase()
        .from('documents')
        .select('content')
        .ilike('content', '%wind%')
        .limit(5);
    
    if (error) console.error("Error:", error);
    else console.log("Wind matches:", data);
}

test();
