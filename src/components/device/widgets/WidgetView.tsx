import { useWidgetAction } from "@/hooks/useWidgetAction";
import type { WidgetActionFailure } from "@/hooks/useWidgetAction";
import React, { FC } from "react";
import { View } from "react-native";
import type { CalculatedWidget, PositionedWidget } from "../dashboards/DashboardView";
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
    onRemove?: () => void;
    onFailure?: (failure: WidgetActionFailure) => void;
    onSuccess?: () => void;
}

type WidgetActionValue = string | number | boolean;

const RenderInternalWidget: FC<{
    positionedWidget: PositionedWidget;
    widget: CalculatedWidget;
    actions?: () => void;
    onAction: (value: WidgetActionValue) => Promise<boolean>;
    pending: boolean;
    disabled: boolean;
    error?: string;
}> = ({ positionedWidget, widget, actions, onAction, pending, disabled, error }) => {
    if (widget.type === "Button") {
        return (
            <ButtonWidget
                widget={widget}
                operations={actions}
                disabled={disabled}
                pending={pending}
                onAction={onAction}
            />
        );
    }

    if (widget.type === "Display") {
        return <DisplayWidget widget={widget} operations={actions} disabled={disabled} />;
    }

    if (widget.type === "Switch") {
        return (
            <SwitchWidget
                operations={actions}
                widget={widget}
                disabled={disabled}
                pending={pending}
                onAction={onAction}
            />
        );
    }

    if (widget.type === "Slider") {
        return (
            <SliderWidget
                widget={widget}
                operations={actions}
                disabled={disabled}
                pending={pending}
                onAction={onAction}
            />
        );
    }

    if (widget.type === "Color") {
        return (
            <ColorWidget
                widget={widget}
                operations={actions}
                disabled={disabled}
                pending={pending}
                onAction={onAction}
                error={error}
            />
        );
    }

    if (widget.type === "Radio") {
        return (
            <RadioWidget
                positionedWidget={positionedWidget}
                widget={widget}
                operations={actions}
                disabled={disabled}
                pending={pending}
                onAction={onAction}
            />
        );
    }

    return <InvalidWidget operations={actions} widget={widget} disabled={disabled} />;
};

const WidgetView: FC<WidgetViewProps> = ({
    calculatedWidget,
    positionedWidget,
    itemHeight,
    itemWidth,
    gap,
    disabled = false,
    onRemove,
    onFailure,
    onSuccess,
}) => {
    const action = useWidgetAction({
        widgetId: calculatedWidget.id,
        disabled,
        onFailure: calculatedWidget.type === "Color" ? undefined : onFailure,
        onSuccess: calculatedWidget.type === "Color" ? undefined : onSuccess,
    });
    const width = itemWidth * positionedWidget.columnSpan + gap * (positionedWidget.columnSpan - 1);
    const height = itemHeight * positionedWidget.rowSpan + gap * (positionedWidget.rowSpan - 1);
    return (
        <View
            style={{
                position: "absolute",
                width,
                height,
                left: positionedWidget.column * (itemWidth + gap),
                top: positionedWidget.row * (itemHeight + gap),
            }}>
            <RenderInternalWidget
                widget={calculatedWidget}
                positionedWidget={positionedWidget}
                actions={onRemove}
                onAction={action.send}
                pending={action.pending}
                disabled={disabled}
                error={action.error}
            />
        </View>
    );
};

export default WidgetView;
