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
    console.log("Checking Synchronization for User Context and Test Data...");

    // 1. Check OPM User
    const { data: opms, error } = await supabase
        .from('users')
        .select('user_id, first_name, last_name, user_role, fk_owner_id')
        .eq('user_role', 'OPM');

    if (error) {
        console.error("Error fetching OPMs:", error);
    } else if (opms && opms.length > 0) {
        console.log("\nOperations Managers found:");
        console.table(opms.map(o => ({
            "Name": `${o.first_name} ${o.last_name}`,
            "User ID": o.user_id,
            "Org (Owner ID)": o.fk_owner_id
        })));
        
        const orgId = opms[0].fk_owner_id;

        // 2. Check Missions for that Org
        console.log(`\nVerifying Compliance Test Missions for Org ${orgId}...`);
        const { data: missions, error: mError } = await supabase
            .from('pilot_mission')
            .select('mission_code, max_altitude, fk_owner_id')
            .eq('fk_owner_id', orgId);

        if (mError) {
            console.error("Error fetching missions:", mError);
        } else {
            console.log(`Found ${missions?.length || 0} missions in Org ${orgId}:`);
            if (missions && missions.length > 0) console.table(missions);
        }

        // 3. Check Alerts for that Org
        console.log(`\nVerifying Alerts...`);
        const { data: alerts } = await supabase.from('alert_log').select('alert_type, alert_severity, alert_status').limit(5);
        const { data: windMatches, error: ragError } = await supabase.from('documents').select('content').ilike('content', '%wind%').limit(5);
    if (ragError) console.error("RAG Check Error:", ragError);
    else {
        console.log("RAG Wind Matches found:", windMatches.length);
        }
    }
}

main().catch(console.error);
