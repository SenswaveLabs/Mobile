import http from "node:http";
import type { Socket } from "node:net";

export interface ReviewInvitation {
    homeId: string;
    email: string;
    password: string;
    role: string;
    used: boolean;
    createdAt: string;
}
export interface SharingPolicy {
    homeId?: string;
    emails?: string[];
    consent?: boolean;
    invitations?: ReviewInvitation[];
    onInvitationsChanged?: (invitations: ReviewInvitation[]) => void;
}

export function allowedSharingWrite(
    method: string,
    path: string,
    body: any,
    policy: SharingPolicy,
) {
    if (!body || typeof body !== "object" || Array.isArray(body)) return false;
    if (method === "POST" && path === "/api/v1/users/consents")
        return policy.consent === true && Object.keys(body).length === 0;
    if (path !== "/api/v1/homes/sharings" || !policy.homeId) return false;
    if (method === "POST")
        return (
            Object.keys(body).length === 3 &&
            body.homeId === policy.homeId &&
            typeof body.friendEmail === "string" &&
            policy.emails?.some(
                (email) => email.trim().toLowerCase() === body.friendEmail.trim().toLowerCase(),
            ) === true &&
            ["Manage", "Display"].includes(body.sharingType)
        );
    if (method === "PUT")
        return (
            Object.keys(body).length === 1 &&
            policy.invitations?.some(
                (invite) =>
                    invite.homeId === policy.homeId &&
                    invite.password === body.password &&
                    !invite.used,
            ) === true
        );
    return false;
}

export function localApiUrl(value: string) {
    const url = new URL(value);
    if (url.hostname === "10.0.2.2") url.hostname = "127.0.0.1";
    if (
        url.protocol !== "http:" ||
        !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
        url.username ||
        url.password
    )
        throw new Error("Visual review requires an HTTP local test API.");
    return url;
}

export function isAllowedRequest(
    method: string,
    path: string,
    commandIds: string[] = [],
    policy: SharingPolicy = {},
) {
    const pathname = path.split("?")[0];
    if (/[\\%]|\.\./.test(pathname)) return false;
    if (["/signalr/liveupdates/live", "/signalr/liveupdates/live/negotiate"].includes(pathname))
        return ["GET", "POST", "DELETE", "OPTIONS"].includes(method);
    if (!path.startsWith("/api/")) return false;
    if (["GET", "HEAD", "OPTIONS"].includes(method)) return true;
    if (path === "/api/v1/homes/sharings" && policy.homeId && ["POST", "PUT"].includes(method))
        return true;
    if (path === "/api/v1/users/consents" && policy.consent && method === "POST") return true;
    if (method !== "POST") return false;
    if (["/api/v1/auth/login", "/api/v1/auth/refresh"].includes(path)) return true;
    return commandIds.some(
        (id) => path === `/api/v1/devices/widgets/${encodeURIComponent(id)}/action`,
    );
}

export function requestJson(
    origin: URL,
    path: string,
    options: { method?: string; body?: unknown; token?: string } = {},
): Promise<{ status: number; body: any }> {
    return new Promise((resolve, reject) => {
        const request = http.request(
            new URL(path, origin),
            {
                method: options.method ?? "GET",
                headers: {
                    "Content-Type": "application/json",
                    ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
                },
                timeout: 20000,
            },
            (response) => {
                let data = "";
                response.setEncoding("utf8");
                response.on("data", (chunk) => {
                    data += chunk;
                    if (data.length > 10000000)
                        request.destroy(new Error("API response too large."));
                });
                response.on("end", () => {
                    try {
                        resolve({
                            status: response.statusCode ?? 500,
                            body: data ? JSON.parse(data) : null,
                        });
                    } catch {
                        reject(
                            new Error(`Invalid JSON from local API (HTTP ${response.statusCode}).`),
                        );
                    }
                });
                response.on("error", reject);
            },
        );
        request.on("timeout", () => request.destroy(new Error("Local API timed out.")));
        request.on("error", reject);
        request.end(options.body === undefined ? undefined : JSON.stringify(options.body));
    });
}

export async function startGateway(
    upstream: URL,
    commandIds: string[] = [],
    policy: SharingPolicy = {},
) {
    localApiUrl(upstream.href);
    const blocked: { method: string; path: string }[] = [];
    const requests: { method: string; path: string }[] = [];
    const sockets = new Set<Socket>();
    const invitations = policy.invitations ?? [];
    policy = { ...policy, invitations };
    const server = http.createServer((incoming, outgoing) => {
        void (async () => {
            const path = incoming.url ?? "/";
            requests.push({ method: incoming.method ?? "", path: path.split("?")[0] });
            const deny = () => {
                blocked.push({ method: incoming.method ?? "", path: path.split("?")[0] });
                outgoing.writeHead(403, { "Content-Type": "application/json" });
                outgoing.end(JSON.stringify({ title: "Write blocked by Expo Visual Review." }));
            };
            if (!isAllowedRequest(incoming.method ?? "", path, commandIds, policy)) {
                deny();
                return;
            }
            let body: Buffer | undefined;
            let data: any;
            if (
                ["POST", "PUT"].includes(incoming.method ?? "") &&
                ["/api/v1/homes/sharings", "/api/v1/users/consents"].includes(path)
            ) {
                const chunks: Buffer[] = [];
                let length = 0;
                for await (const chunk of incoming) {
                    length += chunk.length;
                    if (length > 16384) {
                        deny();
                        return;
                    }
                    chunks.push(chunk);
                }
                body = Buffer.concat(chunks);
                try {
                    data = JSON.parse(body.toString());
                } catch {
                    deny();
                    return;
                }
                if (!allowedSharingWrite(incoming.method!, path, data, policy)) {
                    deny();
                    return;
                }
            }
            const request = http.request(
                new URL(path, upstream),
                {
                    method: incoming.method,
                    headers: { ...incoming.headers, host: upstream.host },
                    timeout: 20000,
                },
                (response) => {
                    if (path === "/api/v1/homes/sharings" && (response.statusCode ?? 500) < 300) {
                        if (incoming.method === "POST") {
                            let result = "";
                            response.on("data", (chunk) => {
                                if (result.length < 16384) result += chunk;
                            });
                            response.on("end", () => {
                                try {
                                    const password = JSON.parse(result).password;
                                    if (
                                        typeof password === "string" &&
                                        /^[A-Z0-9]{8}$/.test(password)
                                    )
                                        invitations.push({
                                            homeId: data.homeId,
                                            email: data.friendEmail.trim().toLowerCase(),
                                            role: data.sharingType,
                                            password,
                                            used: false,
                                            createdAt: new Date().toISOString(),
                                        });
                                    policy.onInvitationsChanged?.(invitations);
                                } catch {
                                    /* A malformed response stays owned by the native form. */
                                }
                            });
                        } else {
                            const invite = invitations.find(
                                (invite) => invite.password === data.password,
                            );
                            if (invite) {
                                invite.used = true;
                                policy.onInvitationsChanged?.(invitations);
                            }
                        }
                    }
                    outgoing.writeHead(response.statusCode ?? 502, response.headers);
                    response.pipe(outgoing);
                },
            );
            request.on("timeout", () => request.destroy());
            request.on("error", () => {
                if (!outgoing.headersSent) outgoing.writeHead(502);
                outgoing.end();
            });
            incoming.on("aborted", () => request.destroy());
            if (body) request.end(body);
            else incoming.pipe(request);
        })().catch(() => {
            if (!outgoing.headersSent) outgoing.writeHead(400);
            outgoing.end();
        });
    });
    server.on("connection", (socket) => {
        sockets.add(socket);
        socket.once("close", () => sockets.delete(socket));
    });
    server.on("upgrade", (incoming, socket, head) => {
        const pathname = incoming.url?.split("?")[0];
        if (pathname !== "/signalr/liveupdates/live") {
            socket.destroy();
            return;
        }
        const request = http.request(new URL(incoming.url!, upstream), {
            method: "GET",
            headers: { ...incoming.headers, host: upstream.host },
        });
        request.on("upgrade", (response, upstreamSocket, upstreamHead) => {
            socket.write(
                `HTTP/1.1 101 Switching Protocols\r\n${Object.entries(response.headers)
                    .map(([key, value]) => `${key}: ${value}`)
                    .join("\r\n")}\r\n\r\n`,
            );
            if (upstreamHead.length) socket.write(upstreamHead);
            if (head.length) upstreamSocket.write(head);
            socket.pipe(upstreamSocket).pipe(socket);
            socket.once("close", () => upstreamSocket.destroy());
            upstreamSocket.once("close", () => socket.destroy());
            socket.on("error", () => upstreamSocket.destroy());
            upstreamSocket.on("error", () => socket.destroy());
        });
        request.on("error", () => socket.destroy());
        request.end();
    });
    await new Promise<void>((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, "127.0.0.1", resolve);
    });
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Gateway did not start.");
    return {
        server,
        port: address.port,
        blocked,
        requests,
        invitations,
        close: () => {
            for (const socket of sockets) socket.destroy();
            server.close();
        },
    };
}
