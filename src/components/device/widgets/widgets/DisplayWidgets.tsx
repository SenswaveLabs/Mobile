import { CalculatedWidget } from "../../dashboards/DashboardView";
import { Pressable } from "react-native";
import { useTheme } from "@/contexts/ThemeProvider";
import Text from "@/components/common/Text";
import { shadowStyles } from "@/styles/shadowStyles";
import { useToast } from "@/contexts/ToastProvider";

interface DisplayWidgetProps {
    operations: () => void;
    widget: CalculatedWidget;
    disabled: boolean;
}

const DisplayWidget = ({ operations, widget, disabled }: DisplayWidgetProps) => {
    const theme = useTheme();
    const toast = useToast();

    const handlePress = () => {
        toast.info("This widget has no action on click.");
    };

    return (
        <Pressable
            style={[
                {
                    backgroundColor: theme.current.colors.primary,
                    borderRadius: 8,
                    alignContent: "center",
                    width: "100%",
                    height: "100%",
                    justifyContent: "center",
                    alignItems: "center",
                    ...shadowStyles.default,
                },
            ]}
            disabled={disabled}
            onPress={handlePress}
            onLongPress={operations}>
            <Text size={"medium"} color={"onPrimary"}>
                {widget?.name}: {widget?.configuration?.runtime?.value}{" "}
                {widget?.configuration?.unit ?? ""}
            </Text>
        </Pressable>
    );
};

export default DisplayWidget;
