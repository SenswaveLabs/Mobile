import assert from "node:assert/strict";
import test from "node:test";
import { mountNativeComponent } from "./nativeComponentHarness.mjs";

const home = (id = "home-1", role = "Owner") => ({
    id,
    name: `Home ${id}`,
    isOwner: role === "Owner",
    canManage: role === "Manage",
    dataSource: undefined,
    location: { latitude: 0, longitude: 0 },
    rooms: [],
});

const automation = (id = "automation-1", homeId = "home-1", results = [], conditions = []) => ({
    id,
    homeId,
    name: `Automation ${id}`,
    icon: "flash-outline",
    conditionConnector: "And",
    isEnabled: true,
    results,
    conditions,
});

const resultDraft = (operationName = "Lamp", operationId = "operation-1") => ({
    operationId,
    operationName,
    valueToSend: "on",
});

const conditionDraft = (operationName = "Lamp", operationId = "operation-1") => ({
    operationId,
    operationName,
    conditionType: "BooleanCondition",
    conditionConfiguration: { isOn: true },
});

function mountAutomationProvider(current = home()) {
    const homes = { current };
    const requests = [];
    const component = mountNativeComponent("src/contexts/custom/AutomationProvider.tsx", {
        exportName: "default",
        modules: {
            "../domain/HomeProvider": { useHomes: () => homes },
            "../HttpClientProvider": {
                useHttpClient: () => ({
                    get: (path) => {
                        requests.push(path);
                        return Promise.resolve({ isSuccess: false, statusCode: 500 });
                    },
                }),
            },
            "../ToastProvider": { useToast: () => ({ httpError() {}, error() {} }) },
        },
    });
    component.flushEffects();
    const value = () => component.output().props.value;
    return { component, homes, requests, value };
}

test("automation sessions bind home data without an implicit GET", () => {
    const { component, value, requests } = mountAutomationProvider(home("home-1", "Manage"));
    assert.equal(typeof value().beginSession, "function");
    const token = value().beginSession("home-1");
    component.render();
    assert.ok(token);
    assert.equal(requests.length, 0);
    assert.equal(value().session.homeId, "home-1");
    assert.equal(value().session.results.length, 0);
});

test("saved automation sessions allow Display reads and reject another home", () => {
    const { component, value, requests } = mountAutomationProvider(home("home-1", "Display"));
    const saved = automation();
    assert.equal(typeof value().beginSession, "function");
    const token = value().beginSession("home-1", saved);
    component.render();
    assert.ok(token);
    assert.equal(value().session.automationId, saved.id);
    assert.equal(value().beginSession("home-1"), "");
    assert.equal(value().appendResult(token, resultDraft()), false);
    assert.equal(value().beginSession("home-2", saved), "");
    assert.equal(requests.length, 0);

    const manager = mountAutomationProvider(home("home-1", "Manage"));
    const managerToken = manager.value().beginSession("home-1", saved);
    manager.component.render();
    assert.equal(manager.value().appendCondition(managerToken, conditionDraft()), false);
    assert.equal(manager.value().appendResult(managerToken, resultDraft()), false);
});

test("create permission loss invalidates retained draft callbacks", () => {
    const { component, homes, value } = mountAutomationProvider(home("home-1", "Manage"));
    const token = value().beginSession("home-1");
    const retainedAppend = value().appendResult;
    component.render();
    homes.current = home("home-1", "Display");
    component.render();
    assert.equal(retainedAppend(token, resultDraft()), false);
    assert.equal(value().isCurrentSession(token), false);
    component.flushEffects();
    component.render();
    assert.equal(value().session, undefined);
});

test("draft removal removes one duplicate row by index", () => {
    const { component, value } = mountAutomationProvider(home("home-1", "Owner"));
    assert.equal(typeof value().beginSession, "function");
    const token = value().beginSession("home-1");
    component.render();
    assert.equal(value().appendCondition(token, conditionDraft("First")), true);
    assert.equal(value().appendCondition(token, conditionDraft("Second")), true);
    assert.equal(value().appendResult(token, resultDraft("First")), true);
    assert.equal(value().appendResult(token, resultDraft("Second")), true);
    component.render();
    assert.equal(value().removeDraftCondition(token, 0), true);
    assert.equal(value().removeDraftResult(token, 0), true);
    component.render();
    const remainingDuplicateRows = value().session.conditions.filter(
        (condition) => condition.operationId === "operation-1",
    );
    assert.equal(remainingDuplicateRows.length, 1);
    assert.equal(remainingDuplicateRows[0].operationName, "Second");
    const remainingResultRows = value().session.results.filter(
        (result) => result.operationId === "operation-1",
    );
    assert.equal(remainingResultRows.length, 1);
    assert.equal(remainingResultRows[0].operationName, "Second");
});

test("draft cap does not cap saved collections", () => {
    const { component, value } = mountAutomationProvider(home("home-1", "Owner"));
    assert.equal(typeof value().beginSession, "function");
    const draftToken = value().beginSession("home-1");
    component.render();
    for (let index = 0; index < 7; index++) {
        assert.equal(
            value().appendCondition(
                draftToken,
                conditionDraft(`Draft ${index}`, `condition-${index}`),
            ),
            true,
        );
        assert.equal(value().appendResult(draftToken, resultDraft(`Draft ${index}`)), true);
    }
    assert.equal(value().appendCondition(draftToken, conditionDraft("Draft eight")), false);
    assert.equal(value().appendResult(draftToken, resultDraft("Draft eight")), false);

    const existingResults = Array.from({ length: 7 }, (_, index) => ({
        ...resultDraft(`Saved ${index}`),
    }));
    const existingConditions = Array.from({ length: 7 }, (_, index) => ({
        ...conditionDraft(`Saved ${index}`, `saved-condition-${index}`),
    }));
    const saved = automation("saved", "home-1", existingResults, existingConditions);
    const savedToken = value().beginSession("home-1", saved);
    component.render();
    assert.equal(value().appendResult(savedToken, resultDraft("Saved eight")), true);
    assert.equal(
        value().appendCondition(savedToken, conditionDraft("Saved eight", "saved-condition-eight")),
        true,
    );
    component.render();
    assert.equal(value().session.results.length, 8);
    assert.equal(value().session.conditions.length, 8);
});

test("stale cleanup cannot clear a new session", () => {
    const { component, value } = mountAutomationProvider(home("home-1", "Manage"));
    assert.equal(typeof value().beginSession, "function");
    const oldToken = value().beginSession("home-1");
    component.render();
    const newToken = value().beginSession("home-1");
    component.render();
    value().clearSession(oldToken);
    component.render();
    assert.equal(value().isCurrentSession(newToken), true);
    assert.equal(value().session.token, newToken);
});

test("home change rejects old callbacks and starts an empty session", () => {
    const { component, homes, value } = mountAutomationProvider(home("home-1", "Owner"));
    assert.equal(typeof value().beginSession, "function");
    const oldToken = value().beginSession("home-1");
    const retainedAppend = value().appendResult;
    component.render();
    homes.current = home("home-2", "Manage");
    component.render();
    const staleAppend = retainedAppend(oldToken, resultDraft());
    assert.equal(staleAppend, false);
    component.flushEffects();
    component.render();
    const newToken = value().beginSession("home-2");
    component.render();
    assert.ok(newToken);
    assert.equal(value().session.results.length, 0);
});
