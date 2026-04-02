import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

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

function stripHtml(html: string): string {
    return html
        .replace(/<table[\s\S]*?<\/table>/gi, "[table]")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function wrapSection(title: string, rawHtml: string): string {
    return `<article>
            <h1>${title}</h1>
            ${rawHtml}
            </article>`;
}

function parseFrd(filePath: string) {
    const raw = readFileSync(filePath, "utf8");
    const sections: Array<{ key: string; title: string; number: string; html: string; plain: string }> = [];

    const parts = raw.split(/<h1>/i);

    for (let i = 1; i < parts.length; i++) {
        const part = parts[i];
        const closingIdx = part.indexOf("</h1>");
        if (closingIdx === -1) continue;

        const title = part.substring(0, closingIdx).replace(/<[^>]+>/g, "").trim();
        const body = part.substring(closingIdx + 5);

        const numMatch = title.match(/^(\d+)\./);
        const sectionNum = numMatch ? numMatch[1] : String(i);

        const key = `mnt_frd_${sectionNum}`;
        const html = wrapSection(title, body);
        const plain = stripHtml(body);

        if (plain.length > 30) {
            sections.push({
                key,
                title,
                number: sectionNum,
                html,
                plain,
            });
        }
    }
    return sections;
}

function parseManual(filePath: string) {
    const raw = readFileSync(filePath, "utf8");
    const sections: Array<{ key: string; title: string; number: string; html: string; plain: string }> = [];
    const parts = raw.split(/\*\*(\d+)\.\s+/);

    for (let i = 1; i < parts.length; i += 2) {
        const sectionNum = parts[i];
        const content = parts[i + 1] || "";

        const titleMatch = content.match(/^(.+?)\*\*/);
        const title = titleMatch ? titleMatch[1].trim() : `Section ${sectionNum}`;
        const body = content.replace(/^\s*.+?\*\*\s*/, "");

        const key = `manual_${sectionNum}`;
        const htmlBody = body
            .split("\n")
            .map((line: string) => {
                const trimmed = line.trim();
                if (!trimmed) return "";
                if (trimmed.startsWith("* **")) 
                    return `<li><strong>${trimmed.replace(/^\* \*\*/, "").replace(/\*\*.*/, "")}</strong>${trimmed.replace(/^.*\*\*:?\s*/, "")}</li>`;
                if (trimmed.startsWith("* ")) 
                    return `<li>${trimmed.substring(2)}</li>`;
                return `<p>${trimmed}</p>`;
            })
            .join("\n");

        const html = wrapSection(title, `<ul>${htmlBody}</ul>`);
        const plain = body.replace(/\*\*/g, "").trim();

        if (plain.length > 30) {
            sections.push({
                key,
                title,
                number: sectionNum,
                html,
                plain,
            });
        }
    }

    return sections;
}

async function main() {
    console.log("=== Ingesting Procedure Documents ===\n");

    const allSections: Array<{
        doc_key: string;
        source_file: string;
        section_title: string;
        section_number: string;
        html_content: string;
        plain_text: string;
    }> = [];

    const frdPath = resolve(process.cwd(), "../new-details-english.txt");
    if (existsSync(frdPath)) {
        const frdSections = parseFrd(frdPath);
        console.log(`FRD: Found ${frdSections.length} sections`);
        for (const s of frdSections) {
            allSections.push({
                doc_key: s.key,
                source_file: "new-details.docx",
                section_title: s.title,
                section_number: s.number,
                html_content: s.html,
                plain_text: s.plain,
            });
        }
    } else {
        console.log("FRD file not found at", frdPath, "— skipping");
    }

    // 2. Operations Manual
    const manualPath = resolve(process.cwd(), "powerpoint_translated_english.txt");
    if (existsSync(manualPath)) {
        const manualSections = parseManual(manualPath);
        console.log(`Manual: Found ${manualSections.length} sections`);
        for (const s of manualSections) {
            allSections.push({
                doc_key: s.key,
                source_file: "powerpoint.pdf",
                section_title: s.title,
                section_number: s.number,
                html_content: s.html,
                plain_text: s.plain,
            });
        }
    } else {
        console.log("Manual file not found at", manualPath, "— skipping");
    }

    if (allSections.length === 0) {
        console.log("No sections found. Exiting.");
        return;
    }

    console.log(`\nUpserting ${allSections.length} sections to procedure_document...`);

    const { error } = await supabase
        .from("procedure_document")
        .upsert(allSections, { onConflict: "doc_key" });

    if (error) {
        console.error("Upsert Error:", error);
        return;
    }

    console.log("Done! All procedure documents are now stored as HTML pages.");
    console.log("They can be viewed at /docs/<doc_key> (e.g., /docs/mnt_frd_8)\n");
}

main().catch(console.error);