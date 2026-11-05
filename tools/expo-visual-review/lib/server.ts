import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { ReviewStore, reviewDirectory } from "./store.ts";

export function withStore<T>(action: (store: ReviewStore) => T): T {
    const repoRoot = resolve(
        process.env.EXPO_REVIEW_REPO ?? fileURLToPath(new URL("../../../", import.meta.url)),
    );
    const store = new ReviewStore(reviewDirectory(repoRoot), repoRoot);
    try {
        return action(store);
    } finally {
        store.close();
    }
}
