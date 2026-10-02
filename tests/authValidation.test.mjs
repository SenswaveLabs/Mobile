import assert from "node:assert/strict";
import test from "node:test";
import {
    validateEmail,
    validateLogin,
    validateRegistration,
    validateServerUrl,
} from "../src/utils/authValidation.ts";
import { AUTH_SCREENS, getAuthScreen } from "../src/components/dom/authTypes.ts";
import * as authValidation from "../src/utils/authValidation.ts";
import * as authRoutes from "../src/components/dom/authTypes.ts";

test("login validation rejects invalid bridge values and preserves password boundaries", () => {
    assert.equal(validateEmail(" user@example.com "), undefined);
    for (const email of ["", "user", "user@", "user @example.com", null, 42]) {
        assert.ok(validateEmail(email));
    }
    assert.deepEqual(validateLogin("user@example.com", "secret"), {
        email: undefined,
        password: undefined,
    });
    for (const password of ["", undefined, null, 42, "x".repeat(65)]) {
        assert.ok(validateLogin("user@example.com", password).password);
    }
    assert.equal(validateLogin("user@example.com", "x".repeat(64)).password, undefined);
});

test("registration enforces password policy, confirmation and explicit consent at the bridge", () => {
    const email = "user@example.com";
    const valid = "Strong123!";
    assert.ok(
        Object.values(validateRegistration(email, valid, valid, true)).every((error) => !error),
    );
    const longest = "Aa1!" + "x".repeat(60);
    assert.equal(validateRegistration(email, longest, longest, true).password, undefined);
    for (const password of [
        null,
        42,
        "",
        "Aa1!short",
        "x".repeat(65),
        "UPPERCASE1!",
        "lowercase1!",
        "NoNumbers!!",
        "NoSpecial123",
    ]) {
        assert.ok(validateRegistration(email, password, password, true).password);
    }
    for (const confirmation of [null, 42, "", "Different1!"]) {
        assert.ok(validateRegistration(email, valid, confirmation, true).confirmPassword);
    }
    for (const consent of [false, undefined, null, "true", 1]) {
        assert.ok(validateRegistration(email, valid, valid, consent).consent);
    }
    assert.ok(validateRegistration(null, valid, valid, true).email);
});

test("server selection accepts absolute HTTP addresses and rejects unsafe bridge values", () => {
    for (const url of [
        "https://senswave.example.com",
        " http://10.0.2.2:8080 ",
        "http://[::1]:8080",
    ]) {
        assert.equal(validateServerUrl(url), undefined);
    }
    for (const url of [
        null,
        42,
        "",
        "   ",
        "/api",
        "senswave.example.com",
        "javascript:alert(1)",
        "ftp://example.com",
        "https://user:secret@example.com",
    ]) {
        assert.ok(validateServerUrl(url));
    }
});

test("only the five DOM auth URLs share the persistent WebView", () => {
    for (const screen of AUTH_SCREENS) assert.equal(getAuthScreen(`/${screen}`), screen);
    for (const path of [
        "/",
        "/resetPassword",
        "/consents",
        "/login/other",
        "/terms",
        "/home",
        "/server-extra",
    ]) {
        assert.equal(getAuthScreen(path), undefined);
    }
});

test("password reset identifies each missing field and rejects invalid codes", () => {
    const empty = authValidation.validateResetPassword?.("", "", "");
    assert.ok(empty?.password, "empty new password needs a field error");
    assert.ok(empty?.confirmPassword, "empty confirmation needs a field error");
    assert.ok(empty?.resetCode, "empty reset code needs a field error");
    for (const code of [null, 42, "", "   ", "x".repeat(513)]) {
        assert.ok(
            authValidation.validateResetPassword?.("Strong123!", "Strong123!", code)?.resetCode,
        );
    }
    for (const code of ["from-email", " pasted-code ", "x".repeat(512)]) {
        assert.deepEqual(authValidation.validateResetPassword?.("Strong123!", "Strong123!", code), {
            password: undefined,
            confirmPassword: undefined,
            resetCode: undefined,
        });
    }
});

test("password reset enforces the new-password policy and matching confirmation", () => {
    for (const password of [
        null,
        42,
        "",
        "Short123!",
        "x".repeat(65),
        "UPPERCASE1!",
        "lowercase1!",
        "NoNumbers!!",
        "NoSpecial123",
    ]) {
        assert.ok(authValidation.validateResetPassword?.(password, password, "code")?.password);
    }
    for (const confirmation of [null, "", "Different1!"]) {
        assert.ok(
            authValidation.validateResetPassword?.("Strong123!", confirmation, "code")
                ?.confirmPassword,
        );
    }
});

test("native password reset shares the auth surface without becoming a DOM screen", () => {
    assert.equal(authRoutes.isAuthSurface?.("/resetPassword"), true);
    assert.equal(getAuthScreen("/resetPassword"), undefined);
    for (const screen of AUTH_SCREENS) assert.equal(authRoutes.isAuthSurface?.(`/${screen}`), true);
    for (const path of ["/resetPassword/other", "/consents", "/", "/home"]) {
        assert.equal(authRoutes.isAuthSurface?.(path), false);
    }
});
