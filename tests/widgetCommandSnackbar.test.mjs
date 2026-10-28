import assert from "node:assert/strict";
import test from "node:test";
import { mountNativeComponent } from "./nativeComponentHarness.mjs";

function mountSnackbar(onRetry) {
    let dismissed = 0;
    const snackbar = mountNativeComponent(
        "src/components/device/widgets/WidgetCommandSnackbar.tsx",
        {
            props: {
                widgetName: "Living room light",
                message: "Couldn't control this widget. Try again.",
                onRetry,
                onDismiss: () => dismissed++,
            },
            modules: { "lucide-react-native": { X: "X" } },
        },
    );
    const press = (label) =>
        snackbar
            .elements()
            .find((node) => node.props?.accessibilityLabel === label)
            .props.onPress();
    return { ...snackbar, press, dismissed: () => dismissed };
}

test("close dismisses feedback without issuing a command", () => {
    let retries = 0;
    const snackbar = mountSnackbar(async () => {
        retries++;
        return true;
    });
    assert.match(snackbar.text(), /Living room light/);
    snackbar.press("Dismiss widget error");
    assert.equal(snackbar.dismissed(), 1);
    assert.equal(retries, 0);
});

test("retry locks synchronously, retains failure and dismisses only on success", async () => {
    let resolve;
    let retries = 0;
    let next = new Promise((done) => (resolve = done));
    const snackbar = mountSnackbar(() => {
        retries++;
        return next;
    });
    const first = snackbar.press("Retry widget command");
    await snackbar.press("Retry widget command");
    assert.equal(retries, 1);
    resolve(false);
    await first;
    snackbar.render();
    assert.equal(snackbar.dismissed(), 0);
    next = Promise.resolve(true);
    await snackbar.press("Retry widget command");
    assert.equal(retries, 2);
    assert.equal(snackbar.dismissed(), 1);
});

test("closing an in-flight retry prevents its late success from dismissing again", async () => {
    let resolve;
    const snackbar = mountSnackbar(() => new Promise((done) => (resolve = done)));
    const retry = snackbar.press("Retry widget command");
    snackbar.press("Dismiss widget error");
    resolve(true);
    await retry;
    assert.equal(snackbar.dismissed(), 1);
});
