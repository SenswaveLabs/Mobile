import { readFileSync } from "node:fs";
import { join } from "node:path";
import { withStore } from "../../../../lib/server";

export const runtime = "nodejs";
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
    const { id } = await context.params;
    return withStore((store) => {
        const capture = store.manifest().captures.find((item) => item.id === id);
        if (!capture || !/^[a-f0-9-]{36}$/.test(id) || capture.file !== `screenshots/${id}.png`)
            return new Response("Screenshot not found", { status: 404 });
        try {
            return new Response(readFileSync(join(store.root, capture.file)), {
                headers: {
                    "Content-Type": "image/png",
                    "Cache-Control": "private, max-age=31536000, immutable",
                    "X-Content-Type-Options": "nosniff",
                },
            });
        } catch {
            return new Response("Screenshot missing. Run review:verify to recapture.", {
                status: 404,
            });
        }
    });
}
