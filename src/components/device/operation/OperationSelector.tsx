import React, { useCallback, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text as NativeText, View } from "react-native";
import { CircleAlert, Plus } from "lucide-react-native";
import { useFocusEffect, useRouter } from "expo-router";
import BottomSheetSelect from "@/components/common/BottomSheetSelect";
import Button from "@/components/common/Button";
import SectionHeaderAction from "@/components/common/SectionHeaderAction";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useHomes } from "@/contexts/domain/HomeProvider";
import { useHttpClient } from "@/contexts/HttpClientProvider";
import { OperationListDto } from "@/contexts/custom/DeviceListProvider";
import { OperationType } from "@/types/DeviceTypes";
import { ListResponse } from "@/utils/httpClient";
import { useTheme } from "@/contexts/ThemeProvider";

interface OperationSelectorProps {
    deviceId: string;
    initialOperationId?: string;
    filterTypes: OperationType[];
    onSelected: (value: string) => void;
    title?: string;
    error?: string;
    disabled?: boolean;
}

interface CatalogState {
    identity: string;
    generation: number;
    operations: OperationListDto[];
    loaded: boolean;
    loading: boolean;
    error: string;
}

const EMPTY_OPTION = { label: "None", selected: false, onPress: () => {} };

function OperationSelector({
    deviceId,
    initialOperationId,
    onSelected,
    filterTypes,
    title = "Operation",
    error,
    disabled = false,
}: OperationSelectorProps) {
    const router = useRouter();
    const homes = useHomes();
    const httpClient = useHttpClient();
    const { colors } = useTheme().current;
    const canManage = homes.current?.isOwner === true || homes.current?.canManage === true;
    const filterKey = filterTypes.join("|");
    const identity = `${deviceId}\u0000${filterKey}`;
    const [retryCount, setRetryCount] = useState(0);
    const [catalogState, setCatalogState] = useState<CatalogState>({
        identity: "",
        generation: 0,
        operations: [],
        loaded: false,
        loading: false,
        error: "",
    });
    const requestGeneration = useRef(0);
    const focused = useRef(false);
    const identityRef = useRef(identity);
    identityRef.current = identity;
    const selectedRef = useRef(onSelected);
    selectedRef.current = onSelected;
    const disabledRef = useRef(disabled);
    disabledRef.current = disabled;
    const canManageRef = useRef(canManage);
    canManageRef.current = canManage;
    const filterTypesRef = useRef(filterTypes);
    filterTypesRef.current = filterTypes;
    const httpClientRef = useRef(httpClient);
    httpClientRef.current = httpClient;

    useFocusEffect(
        useCallback(() => {
            const requestIdentity = identity;
            const requestDeviceId = deviceId;
            const requestTypes = [...filterTypesRef.current];
            const generation = ++requestGeneration.current;
            focused.current = true;
            setCatalogState((current) => ({
                identity: requestIdentity,
                generation,
                operations: current.identity === requestIdentity ? current.operations : [],
                loaded: current.identity === requestIdentity && current.loaded,
                loading: true,
                error:
                    current.identity === requestIdentity && retryCount === 0 ? current.error : "",
            }));

            const isCurrent = () =>
                focused.current &&
                requestGeneration.current === generation &&
                identityRef.current === requestIdentity;

            const load = async () => {
                try {
                    const result = await httpClientRef.current.get(
                        `v1/devices/operations/display?deviceId=${requestDeviceId}&page=1&size=2147483647`,
                    );
                    let operations: OperationListDto[];
                    if (result.statusCode === 404) {
                        operations = [];
                    } else {
                        if (!result.isSuccess || !result.response) throw new Error();
                        const content =
                            (await result.response.json()) as ListResponse<OperationListDto>;
                        if (
                            !Array.isArray(content?.items) ||
                            content.items.some(
                                (item) =>
                                    !item ||
                                    typeof item.id !== "string" ||
                                    !item.id ||
                                    typeof item.name !== "string" ||
                                    typeof item.type !== "string",
                            )
                        )
                            throw new Error();
                        operations = content.items.filter((item) =>
                            requestTypes.includes(item.type),
                        );
                    }
                    if (!isCurrent()) return;
                    setCatalogState({
                        identity: requestIdentity,
                        generation,
                        operations,
                        loaded: true,
                        loading: false,
                        error: "",
                    });
                } catch {
                    if (!isCurrent()) return;
                    setCatalogState((current) => ({
                        identity: requestIdentity,
                        generation,
                        operations: current.identity === requestIdentity ? current.operations : [],
                        loaded: current.identity === requestIdentity && current.loaded,
                        loading: false,
                        error: "Failed to load operations.",
                    }));
                }
            };

            void load();
            return () => {
                focused.current = false;
                requestGeneration.current++;
            };
        }, [deviceId, identity, retryCount]),
    );

    const catalog =
        catalogState.identity === identity
            ? catalogState
            : {
                  identity,
                  generation: 0,
                  operations: [],
                  loaded: false,
                  loading: false,
                  error: "",
              };
    const storedId = initialOperationId && initialOperationId !== "None" ? initialOperationId : "";
    const selectedOperation = catalog.operations.find((operation) => operation.id === storedId);
    const unavailable = !!storedId && !selectedOperation;
    const value = selectedOperation
        ? `${selectedOperation.type} - ${selectedOperation.name}`
        : unavailable
          ? "Unavailable operation"
          : "None";
    const selectionAllowed = (choiceGeneration: number) =>
        focused.current &&
        choiceGeneration === requestGeneration.current &&
        identityRef.current === identity &&
        !disabledRef.current &&
        canManageRef.current;
    const choose = (operationId: string) => {
        if (selectionAllowed(catalog.generation)) selectedRef.current(operationId);
    };
    const options = [
        ...(unavailable
            ? [{ label: "Unavailable operation", selected: true, onPress: () => {} }]
            : []),
        ...catalog.operations.map((operation) => ({
            label: `${operation.type} - ${operation.name}`,
            selected: operation.id === storedId,
            onPress: () => choose(operation.id),
        })),
        {
            label: EMPTY_OPTION.label,
            selected: !storedId,
            onPress: () => choose("None"),
        },
    ];
    const addClicked = () => {
        if (
            !focused.current ||
            identityRef.current !== identity ||
            disabledRef.current ||
            !canManageRef.current
        )
            return;
        router.push({ pathname: "device/operation/add", params: { deviceId } });
    };
    const retry = () => {
        if (!focused.current || disabledRef.current || !canManageRef.current) return;
        setRetryCount((count) => count + 1);
    };

    return (
        <View style={styles.container}>
            <View style={styles.fieldRow}>
                <View style={styles.selector}>
                    <BottomSheetSelect
                        title={title}
                        value={value}
                        options={options}
                        disabled={disabled || !canManage}
                        busy={catalog.loading}
                    />
                </View>
                {catalog.loading && (
                    <ActivityIndicator
                        size="small"
                        color={colors.authForeground}
                        accessibilityLabel="Loading operations"
                    />
                )}
                {canManage && (
                    <SectionHeaderAction
                        label="Add operation"
                        accessibilityLabel="Add operation"
                        icon={<Plus size={20} color={colors.authForeground} accessible={false} />}
                        disabled={disabled}
                        onPress={addClicked}
                    />
                )}
            </View>
            {catalog.loaded && catalog.operations.length === 0 && (
                <NativeText style={[styles.helper, { color: colors.authMuted }]}>
                    No compatible operations found.
                </NativeText>
            )}
            {!!catalog.error && (
                <>
                    <Alert
                        icon={CircleAlert}
                        variant="destructive"
                        accessibilityRole="alert"
                        accessibilityLiveRegion="polite">
                        <AlertDescription>{catalog.error}</AlertDescription>
                    </Alert>
                    <Button
                        name="Retry"
                        type="brand-outline"
                        loading={catalog.loading}
                        disabled={disabled}
                        onPress={retry}
                    />
                </>
            )}
            {!!error && (
                <Alert
                    icon={CircleAlert}
                    variant="destructive"
                    accessibilityRole="alert"
                    accessibilityLiveRegion="polite">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
        </View>
    );
}

export default OperationSelector;

const styles = StyleSheet.create({
    container: { width: "100%", gap: 8 },
    fieldRow: { width: "100%", flexDirection: "row", alignItems: "flex-end", gap: 8 },
    selector: { flex: 1, minWidth: 0 },
    helper: { fontSize: 14, lineHeight: 20 },
});
