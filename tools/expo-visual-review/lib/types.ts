export interface RouteRecord {
    id: string;
    pathname: string;
    source: string;
    groups: string[];
    parameters: { name: string; catchAll: boolean }[];
    queryParameters: string[];
    layouts: string[];
    presentation?: string;
    internal?: boolean;
}

export interface LayoutRecord {
    source: string;
    navigator: string;
    screens: { name: string; presentation?: string }[];
}

export interface Discovery {
    routeRoot: string;
    routes: RouteRecord[];
    layouts: LayoutRecord[];
    engine: string;
    warnings: string[];
}

export interface Step {
    openLink?: string;
    tapOn?: string | { id: string } | { text: string; index?: number };
    assertVisible?: string;
    assertNotVisible?: string;
    scroll?: boolean;
    back?: boolean;
    hideKeyboard?: boolean;
    inputText?: string;
    inputTextEnv?: string;
    eraseText?: boolean;
}

export interface Scenario {
    routeId: string;
    state: string;
    params?: Record<string, string | string[]>;
    testData?: boolean;
    authenticated?: boolean;
    assertVisible: string;
    steps?: Step[];
    setup?: Step[];
    skip?: string;
    verifySteps?: Step[];
    verifyBlocked?: string;
    cleanup?: Step[];
}

export interface CaptureInput {
    routeId: string;
    state: string;
    platform: "android" | "ios";
    device: string;
    commit: string;
    dirty: boolean;
    href: string;
    steps: Step[];
    runId: string;
    params?: Record<string, string | string[]>;
    account?: string;
    authenticated?: boolean;
    cleanup?: Step[];
    verifySteps?: Step[];
    verifyBlocked?: string;
}

export interface Capture extends CaptureInput {
    id: string;
    file: string;
    width: number;
    height: number;
    sha256: string;
    createdAt: string;
}

export interface Attempt {
    routeId: string;
    state: string;
    status: "captured" | "failed" | "blocked";
    reason?: string;
    runId: string;
    createdAt: string;
    captureId?: string;
}

export interface Manifest extends Discovery {
    version: 1;
    repoRoot: string;
    captures: Capture[];
    attempts: Attempt[];
    updatedAt: string;
}

export type ZoomMode = "height" | "width" | "actual";

export type Geometry =
    | { type: "point"; x: number; y: number }
    | { type: "rect"; x: number; y: number; width: number; height: number };
export type Priority = "low" | "medium" | "high" | "critical";
export type Status = "open" | "in_progress" | "fixed" | "accepted";

export interface Annotation {
    id: string;
    captureId: string;
    geometry: Geometry;
    comment: string;
    priority: Priority;
    status: Status;
    createdAt: string;
    updatedAt: string;
}

export interface ReviewData {
    manifest: Manifest;
    annotations: Annotation[];
    directory: string;
}
