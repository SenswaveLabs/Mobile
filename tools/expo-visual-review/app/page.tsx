import { withStore } from "../lib/server";
import Review from "./review";

export const dynamic = "force-dynamic";
export default function Page() {
    const data = withStore((store) => ({
        manifest: store.manifest(),
        annotations: store.annotations(),
        directory: store.root,
    }));
    return <Review {...data} />;
}
