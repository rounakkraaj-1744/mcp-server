import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

// Load .env manually
const envPath = resolve(process.cwd(), ".env");
if (existsSync(envPath)) {
    const envContent = readFileSync(envPath, "utf8");
    for (const line of envContent.split("\n")) {
        const match = line.match(/^\s*([\w.]+)\s*=\s*"?(.+?)"?\s*$/);
        if (match) process.env[match[1]] = match[2];
    }
}

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
    const { data: tools, error: ttError } = await supabase.from('tool').select('tool_id, fk_tool_type_id').limit(5);
    console.log("Existing Tools:", tools);
    const { data: pilot, error: pError } = await supabase.from('users').select('user_id, first_name').eq('user_id', 91).single();
    if (!pilot) {
        const { data: anyPilot } = await supabase.from('users').select('user_id, first_name').limit(5);
        console.log("Pilots Available:", anyPilot);
    } else {
        console.log("Pilot 91 found:", pilot);
    }
}

main().catch(console.error);
