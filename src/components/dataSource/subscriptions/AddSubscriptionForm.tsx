import Button from "@/components/common/Button";
import FormSection from "@/components/common/FormSection";
import Input from "@/components/common/Input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useHttpClient } from "@/contexts/HttpClientProvider";
import { keyboardOffset } from "@/styles/defaultStyles";
import { CreateSubscriptionRequest } from "@/types/DataSourcesTypes";
import { useFocusEffect, useRouter } from "expo-router";
import { CircleAlert, Info } from "lucide-react-native";
import React, { FC, useCallback, useRef, useState } from "react";
import { AccessibilityInfo, StyleSheet, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

interface AddSubscriptionFormProps {
    brokerId: string;
}

type ActionFeedback = {
    message: string;
    variant: "default" | "destructive";
};

const AddSubscriptionForm: FC<AddSubscriptionFormProps> = ({ brokerId }) => {
    const httpClient = useHttpClient();
    const router = useRouter();

    const [pending, setPending] = useState(false);
    const [topic, setTopic] = useState("");
    const [topicError, setTopicError] = useState("");
    const [actionFeedback, setActionFeedback] = useState<ActionFeedback | null>(null);

    const topicRef = useRef<TextInput>(null);
    const submitLock = useRef(false);
    const accepted = useRef(false);
    const returning = useRef(false);
    const announced = useRef(false);
    const focused = useRef(false);

    const returnToDetails = useCallback(() => {
        if (!focused.current || !accepted.current || returning.current) return;

        if (!announced.current) {
            announced.current = true;
            AccessibilityInfo.announceForAccessibility("Subscription added.");
        }

        returning.current = true;
        try {
            if (router.canGoBack()) {
                router.back();
            } else {
                router.replace({ pathname: "/dataSource/details", params: { id: brokerId } });
            }
            setActionFeedback(null);
        } catch {
            returning.current = false;
            setActionFeedback({
                message: "Subscription added. Return to the data source to view it.",
                variant: "default",
            });
        }
    }, [brokerId, router]);

    useFocusEffect(
        useCallback(() => {
            focused.current = true;
            if (accepted.current) returnToDetails();
            return () => {
                focused.current = false;
            };
        }, [returnToDetails]),
    );

    const changeTopic = (value: string) => {
        if (submitLock.current || accepted.current || !focused.current) return;
        setTopic(value);
        setTopicError("");
        setActionFeedback(null);
    };

    const submit = async () => {
        if (submitLock.current || accepted.current || !focused.current) return;

        submitLock.current = true;
        setActionFeedback(null);
        const error =
            topic.trim() === ""
                ? "Topic is required."
                : topic.length > 256
                  ? "Topic must be 256 characters or fewer."
                  : "";
        setTopicError(error);
        if (error) {
            topicRef.current?.focus();
            submitLock.current = false;
            return;
        }

        setPending(true);
        try {
            const body: CreateSubscriptionRequest = { topic: topic.trim() };
            const result = await httpClient.post(
                `v1/datasources/brokers/${brokerId}/subscriptions`,
                body,
            );
            if (!result.isSuccess) {
                if (focused.current) {
                    setActionFeedback({
                        message:
                            "Couldn't add the subscription. Check your connection and try again.",
                        variant: "destructive",
                    });
                }
                return;
            }

            accepted.current = true;
            returnToDetails();
        } catch {
            if (!accepted.current && focused.current) {
                setActionFeedback({
                    message: "Couldn't add the subscription. Check your connection and try again.",
                    variant: "destructive",
                });
            }
        } finally {
            submitLock.current = false;
            setPending(false);
        }
    };

    const returnAfterNavigationFailure = () => {
        if (focused.current && accepted.current) returnToDetails();
    };

    return (
        <KeyboardAwareScrollView
            bottomOffset={keyboardOffset}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled">
            <View style={styles.content}>
                <FormSection
                    title="Add subscription"
                    helper="Enter the MQTT topic this broker client should listen to."
                    actions={[
                        actionFeedback ? (
                            <Alert
                                key="feedback"
                                icon={actionFeedback.variant === "destructive" ? CircleAlert : Info}
                                variant={actionFeedback.variant}>
                                <AlertDescription>{actionFeedback.message}</AlertDescription>
                            </Alert>
                        ) : null,
                        actionFeedback?.variant === "default" ? (
                            <Button
                                key="return"
                                name="Return to data source"
                                type="brand-outline"
                                loading={false}
                                onPress={returnAfterNavigationFailure}
                                style={styles.actionButton}
                            />
                        ) : (
                            <Button
                                key="submit"
                                name="Add subscription"
                                type="auth"
                                loading={pending}
                                disabled={pending || accepted.current}
                                onPress={submit}
                                style={styles.actionButton}
                            />
                        ),
                    ]}>
                    <Input
                        title="Topic"
                        placeholder="home/sensor"
                        value={topic}
                        setValue={changeTopic}
                        error={topicError}
                        variant="auth"
                        autoCapitalize="none"
                        autoCorrect={false}
                        returnKeyType="go"
                        submitBehavior="submit"
                        maxLength={256}
                        editable={!accepted.current}
                        accessibilityState={{ busy: pending }}
                        inputRef={topicRef}
                        onSubmitEditing={submit}
                    />
                </FormSection>
            </View>
        </KeyboardAwareScrollView>
    );
};

export default AddSubscriptionForm;

const styles = StyleSheet.create({
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 16,
        paddingTop: 24,
        paddingBottom: 16,
    },
    content: {
        width: "100%",
        maxWidth: 448,
        alignSelf: "center",
    },
    actionButton: { width: "100%" },
});
