import Button from "@/components/common/Button";
import Divider from "@/components/common/Divider";
import Markdown from "@/components/common/Markdown";
import Text from "@/components/common/Text";
import { useConfiguration } from "@/contexts/ConfigurationProvider";
import { LegalDocument, useLegal } from "@/contexts/domain/LegalProvider";
import { useTheme } from "@/contexts/ThemeProvider";
import { useFocusEffect } from "expo-router";
import { FC, useCallback, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet } from "react-native";

interface LegalDocumentViewProps {
    kind: "privacy" | "terms";
}

type ReadState =
    | { identity: string; status: "Loading" }
    | { identity: string; status: "Error" }
    | { identity: string; status: "Ready"; document: LegalDocument };
type LegalReadResult = { isSuccess: boolean; data?: LegalDocument | null };
type LoadDocument = (
    requestIdentity: string,
    requestKind: LegalDocumentViewProps["kind"],
    focusEpoch: number,
    identityGeneration: number,
) => void;

const LegalDocumentView: FC<LegalDocumentViewProps> = ({ kind }) => {
    const configuration = useConfiguration();
    const legal = useLegal();
    const theme = useTheme();
    const legalRef = useRef(legal);
    const requestsRef = useRef(new Map<string, Promise<LegalReadResult>>());
    const focusedRef = useRef(false);
    const focusEpochRef = useRef(0);
    const identityRef = useRef("");
    const identityGenerationRef = useRef(0);
    const loadRef = useRef<LoadDocument>(() => {});
    const [state, setState] = useState<ReadState>({ identity: "", status: "Loading" });

    legalRef.current = legal;

    let server = "";
    try {
        server = configuration.getBaseUrl().toString();
    } catch {
        // The local error state owns invalid configuration recovery.
    }
    const identity = JSON.stringify([kind, server]);
    if (identityRef.current !== identity) {
        identityRef.current = identity;
        identityGenerationRef.current++;
    }
    const identityGeneration = identityGenerationRef.current;

    const load = useCallback(
        (
            requestIdentity: string,
            requestKind: LegalDocumentViewProps["kind"],
            focusEpoch: number,
            requestIdentityGeneration: number,
        ) => {
            const viewIsCurrent = () =>
                focusedRef.current &&
                focusEpochRef.current === focusEpoch &&
                identityRef.current === requestIdentity &&
                identityGenerationRef.current === requestIdentityGeneration;
            if (!viewIsCurrent()) return;

            if (!server) {
                setState({ identity: requestIdentity, status: "Error" });
                return;
            }

            const getDocument =
                requestKind === "terms" ? legalRef.current.getTerms : legalRef.current.getPrivacy;
            let request = requestsRef.current.get(requestIdentity);
            if (!request) {
                request = Promise.resolve()
                    .then(() => {
                        if (!viewIsCurrent()) return { isSuccess: false };
                        return getDocument();
                    })
                    .catch(() => ({ isSuccess: false }));
                requestsRef.current.set(requestIdentity, request);
                void request.then(() => {
                    if (requestsRef.current.get(requestIdentity) === request) {
                        requestsRef.current.delete(requestIdentity);
                    }
                });
            }

            setState({ identity: requestIdentity, status: "Loading" });
            void request.then((result) => {
                if (!viewIsCurrent()) return;
                if (result.isSuccess && result.data) {
                    setState({ identity: requestIdentity, status: "Ready", document: result.data });
                } else {
                    setState({ identity: requestIdentity, status: "Error" });
                }
            });
        },
        [server],
    );
    loadRef.current = load;

    useFocusEffect(
        useCallback(() => {
            focusedRef.current = true;
            const focusEpoch = ++focusEpochRef.current;
            loadRef.current(identity, kind, focusEpoch, identityGenerationRef.current);
            return () => {
                focusedRef.current = false;
                focusEpochRef.current++;
            };
        }, [identity, kind]),
    );

    const currentState: ReadState =
        state.identity === identity ? state : { identity, status: "Loading" };
    const title = kind === "terms" ? "Terms and Conditions" : "Privacy Policy";
    const retry = () => loadRef.current(identity, kind, focusEpochRef.current, identityGeneration);

    return (
        <ScrollView
            style={[styles.scroll, { backgroundColor: theme.current.colors.background }]}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled">
            {currentState.status === "Loading" && (
                <>
                    <ActivityIndicator color={theme.current.colors.complementary} />
                    <Text size="small" color="onBackground" numberOfLines={0}>
                        Loading {title.toLowerCase()}…
                    </Text>
                </>
            )}
            {currentState.status === "Error" && (
                <>
                    <Text size="small" color="onBackground" numberOfLines={0}>
                        We couldn't load {title.toLowerCase()}. Try again.
                    </Text>
                    <Button name="Retry" loading={false} type="brand-outline" onPress={retry} />
                </>
            )}
            {currentState.status === "Ready" && (
                <>
                    <Text size="medium" color="onBackground" numberOfLines={0}>
                        Version: {currentState.document.version}
                    </Text>
                    <Divider />
                    <Markdown>{currentState.document.summary}</Markdown>
                    <Divider />
                    <Markdown>{currentState.document.content}</Markdown>
                </>
            )}
        </ScrollView>
    );
};

export default LegalDocumentView;

const styles = StyleSheet.create({
    scroll: { flex: 1 },
    content: {
        flexGrow: 1,
        width: "100%",
        maxWidth: 448,
        alignSelf: "center",
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 24,
        gap: 16,
    },
});
