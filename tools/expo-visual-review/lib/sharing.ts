import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Scenario, RouteRecord, Step } from "./types.ts";
import type { ReviewInvitation, SharingPolicy } from "./gateway.ts";
import { accountCredentials, testApi, type Fixtures } from "./testData.ts";

export async function sharingScenarios(
    routes: RouteRecord[],
    fixtures: Fixtures,
    directory: string,
) {
    if (!fixtures.homeId || !fixtures.deviceId)
        throw new Error("Prepare the owner's named review fixtures before sharing.");
    const account = process.env.EXPO_REVIEW_ACCOUNT ?? "AGENT";
    accountCredentials(account);
    const homeId = fixtures.homeId;
    const owner = await testApi();
    const home = (await owner.call(`v1/homes/${homeId}`)).body;
    if (home?.id !== homeId || home?.name !== "Expo Visual Review" || home?.isOwner !== true)
        throw new Error("Sharing must remain bound to the owned Expo Visual Review home.");
    const profiles = ["AGENT2", "AGENT3"];
    const emails = profiles.map((profile) =>
        accountCredentials(profile).email.trim().toLowerCase(),
    );
    const policy: SharingPolicy = { homeId, emails, consent: account !== "AGENT" };
    const id = (path: string) => {
        const route = routes.find((route) => route.pathname === path);
        if (!route) throw new Error(`Required sharing route missing: ${path}`);
        return route.id;
    };
    const scenarios: Scenario[] = [];
    const access = await owner.call(`v1/homes/sharings?homeId=${homeId}`);
    const members = access.status === 404 ? [] : access.body?.items;
    if (!Array.isArray(members)) throw new Error("Invalid review-home access response.");
    if (account === "AGENT") {
        const path = join(directory, "private-invitations.json");
        const invitations: ReviewInvitation[] = existsSync(path)
            ? JSON.parse(readFileSync(path, "utf8"))
            : [];
        for (const [index, profile] of profiles.entries()) {
            const api = await testApi(profile);
            const user = (await api.call("v1/users")).body;
            const homes =
                user?.hasActiveConsent === true ? await api.items("v1/homes?page=1&size=1000") : [];
            if (
                homes.some((home) => home.id === homeId) ||
                invitations.some(
                    (invite) =>
                        invite.email === emails[index] &&
                        !invite.used &&
                        Date.now() - Date.parse(invite.createdAt) < 14 * 60000,
                )
            )
                continue;
            scenarios.push({
                routeId: id("/home/share"),
                state: `invitation-created-${profile.toLowerCase()}`,
                params: { id: homeId },
                testData: true,
                authenticated: true,
                ...(scenarios.length
                    ? {
                          setup: [
                              { tapOn: "Done" },
                              { openLink: `/home/share?id=${encodeURIComponent(homeId)}` },
                          ],
                      }
                    : {}),
                steps: [
                    { tapOn: "friend@example.com" },
                    { inputTextEnv: `${profile}_ACCOUNT_EMAIL` },
                    { hideKeyboard: true },
                    { tapOn: index === 0 ? "Manage home.*" : "Display and control.*" },
                    { scroll: true },
                    { tapOn: "Create invitation" },
                ],
                assertVisible: "Copy invitation code",
                verifyBlocked:
                    "Invitation creation is a one-time accepted write. Use a new unjoined test account/invitation to recapture; verification never repeats this POST.",
            });
        }
        scenarios.push({
            routeId: id("/home/details"),
            state: "owner-access",
            authenticated: true,
            assertVisible: "Rooms",
        });
    } else {
        const api = await testApi(account);
        const user = (await api.call("v1/users")).body;
        if (typeof user?.hasActiveConsent !== "boolean")
            throw new Error("Invalid test-account consent response.");
        if (!user.hasActiveConsent)
            scenarios.push({
                routeId: id("/consents"),
                state: `consent-${account.toLowerCase()}`,
                authenticated: true,
                ...(account !== "AGENT4"
                    ? {
                          verifyBlocked:
                              "This test account has accepted consent. Use untouched AGENT4 to review the pre-consent state; verification never resets or repeats consent.",
                      }
                    : {}),
                assertVisible: "Review and accept",
            });
        if (account === "AGENT4") return { policy: { ...policy, consent: false }, scenarios };
        const homes = user.hasActiveConsent ? await api.items("v1/homes?page=1&size=1000") : [];
        if (!homes.some((home) => home.id === homeId)) {
            scenarios.push({
                routeId: id("/"),
                state: `before-join-${account.toLowerCase()}`,
                authenticated: true,
                ...(user.hasActiveConsent
                    ? {}
                    : { setup: [{ openLink: "/consents" }, { tapOn: "Accept" }] }),
                assertVisible: "Set up your home",
                verifyBlocked:
                    "The account has since joined a home. Use a new unjoined account for this state.",
            });
            const fill: Step[] = [
                { openLink: "/home/join" },
                { tapOn: "Invite code, character 1 of 8" },
                { eraseText: true },
                { inputTextEnv: `EXPO_REVIEW_INVITE_CODE_${account}` },
                { hideKeyboard: true },
            ];
            scenarios.push({
                routeId: id("/home/join"),
                state: `invite-filled-${account.toLowerCase()}`,
                authenticated: true,
                setup: fill,
                assertVisible: "Join a home",
            });
            scenarios.push({
                routeId: id("/"),
                state: `joined-${account.toLowerCase()}`,
                authenticated: true,
                setup: [...fill, { tapOn: "Join home" }],
                assertVisible: "Devices",
                verifySteps: [{ openLink: "/" }, { assertVisible: "Devices" }],
            });
        }
        scenarios.push({
            routeId: id("/"),
            state: account === "AGENT2" ? "manager-home" : "member-home",
            authenticated: true,
            steps:
                account === "AGENT3"
                    ? [{ assertNotVisible: "Add device" }]
                    : [{ assertVisible: "Add device" }],
            assertVisible: "Devices",
        });
        scenarios.push({
            routeId: id("/device/device"),
            state: account === "AGENT2" ? "manager-dashboard" : "member-dashboard",
            params: { deviceId: fixtures.deviceId },
            testData: true,
            authenticated: true,
            assertVisible: "Review Switch",
        });
    }
    return { policy, scenarios };
}
