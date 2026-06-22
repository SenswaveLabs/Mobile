import ConfirmDialog from "@/components/common/ConfirmDialog";
import React, { FC, useState } from "react";
import { View } from "react-native";
import { useHttpClient } from "@/contexts/HttpClientProvider";
import { useToast } from "@/contexts/ToastProvider";
import { useDevice } from "@/contexts/custom/DeviceProvider";
import { CalculatedWidget, PositionedWidget } from "../dashboards/DashboardView";
import DisplayWidget from "./widgets/DisplayWidgets";
import ButtonWidget from "./widgets/ButtonWidget";
import InvalidWidget from "./widgets/InvalidWidget";
import SwitchWidget from "./widgets/SwitchWidget";
import SliderWidget from "./widgets/SliderWidget";
import ColorWidget from "./widgets/ColorWidget";
import RadioWidget from "./widgets/RadioWidget";

interface WidgetViewProps {
    calculatedWidget: CalculatedWidget;
    positionedWidget: PositionedWidget;
    itemWidth: number;
    itemHeight: number;
    gap: number;
    disabled?: boolean;
}

const RenderInternalWidget: FC<{
    positionedWidget: PositionedWidget;
    widget: CalculatedWidget;
    actions: () => void;
    disabled: boolean;
}> = ({ positionedWidget, widget, actions, disabled }) => {
    if (widget.type === "Button") {
        return <ButtonWidget widget={widget} operations={actions} disabled={disabled} />;
    }

    if (widget.type === "Display") {
        return <DisplayWidget widget={widget} operations={actions} disabled={disabled} />;
    }

    if (widget.type === "Switch") {
        return <SwitchWidget operations={actions} widget={widget} disabled={disabled} />;
    }

    if (widget.type === "Slider") {
        return <SliderWidget widget={widget} operations={actions} disabled={disabled} />;
    }

    if (widget.type === "Color") {
        return <ColorWidget widget={widget} operations={actions} disabled={disabled} />;
    }

    if (widget.type === "Radio") {
        return (
            <RadioWidget
                positionedWidget={positionedWidget}
                widget={widget}
                operations={actions}
                disabled={disabled}
            />
        );
    }

    return <InvalidWidget operations={actions} widget={widget} disabled={disabled} />;
};

export default function WidgetView({
    calculatedWidget,
    positionedWidget,
    itemHeight,
    itemWidth,
    gap,
    disabled = false,
}: WidgetViewProps) {
    const toast = useToast();
    const httpClient = useHttpClient();
    const device = useDevice();
    const [showUnlinkDialog, setShowUnlinkDialog] = useState(false);

    const unlinkWidgetFromDashboardRequest = async () => {
        try {
            const result = await httpClient.delete(
                `v1/devices/dashboards/${device.currentDashboardId}/widgets/${calculatedWidget.id}`,
            );

            if (result.isSuccess) {
                toast.success("Widget removed successfully");
                device.refresh(true);
            } else {
                toast.httpError(result);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to remove widget");
        }
    };

    const actions = () => {
        setShowUnlinkDialog(true);
    };

    return (
        <>
            <ConfirmDialog
                visible={showUnlinkDialog}
                title="Remove from Dashboard"
                content="The widget will be removed from this dashboard. The widget definition stays intact."
                confirmLabel="Remove"
                onConfirm={() => {
                    setShowUnlinkDialog(false);
                    unlinkWidgetFromDashboardRequest();
                }}
                onCancel={() => setShowUnlinkDialog(false)}
            />
            <View
                style={{
                    position: "absolute",
                    justifyContent: "center",
                    alignItems: "center",
                    borderRadius: 8,
                    width:
                        itemWidth * positionedWidget.columnSpan +
                        gap * (positionedWidget.columnSpan - 1),
                    height:
                        itemHeight * positionedWidget.rowSpan +
                        gap * (positionedWidget.rowSpan - 1),
                    left: positionedWidget.column * (itemWidth + gap),
                    top: positionedWidget.row * (itemHeight + gap),
                }}>
                <RenderInternalWidget
                    widget={calculatedWidget}
                    positionedWidget={positionedWidget}
                    actions={actions}
                    disabled={disabled}
                />
            </View>
        </>
    );
}
