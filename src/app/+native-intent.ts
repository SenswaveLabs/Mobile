export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
    let isConfirmationLink = false;
    try {
        const incoming = new URL(path, "https://senswave.invalid");
        const pathname = incoming.pathname.replace(/\/+$/, "") || "/";
        const isHttp = incoming.protocol === "http:" || incoming.protocol === "https:";
        isConfirmationLink = isHttp
            ? pathname === "/confirmEmail"
            : incoming.host
              ? incoming.host.toLowerCase() === "confirmemail" && pathname === "/"
              : pathname === "/confirmEmail";
        if (!isConfirmationLink) return path;

        decodeURIComponent(incoming.search.slice(1));
        const userIds = incoming.searchParams.getAll("userId");
        const codes = incoming.searchParams.getAll("code");
        if (userIds.length !== 1 || codes.length !== 1 || !userIds[0] || !codes[0])
            return "/confirmEmail";

        const query = new URLSearchParams();
        // Expo Router's state parser and local-param hook each decode one query layer.
        query.set("userId", encodeURIComponent(userIds[0]));
        query.set("code", encodeURIComponent(codes[0]));
        return `/confirmEmail?${query.toString()}`;
    } catch {
        return isConfirmationLink ? "/confirmEmail" : path;
    }
}
