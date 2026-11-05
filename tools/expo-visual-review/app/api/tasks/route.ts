import { readFileSync } from "node:fs";
import { join } from "node:path";
import { withStore } from "../../../lib/server";

export const runtime = "nodejs";
export async function GET(request: Request) {
    const markdown = new URL(request.url).searchParams.get("format") === "md";
    return withStore((store) => {
        const exported = store.exportTasks();
        const file = markdown ? "tasks.md" : "tasks.json";
        return new Response(readFileSync(join(exported.directory, file)), {
            headers: {
                "Content-Type": markdown ? "text/markdown; charset=utf-8" : "application/json",
                "Content-Disposition": `attachment; filename="${file}"`,
                "Cache-Control": "no-store",
            },
        });
    });
}
