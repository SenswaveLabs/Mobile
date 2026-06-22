import { useTheme } from "@/contexts/ThemeProvider";
import { shadowStyles } from "@/styles/shadowStyles";
import React, { useEffect, useState } from "react";
import { View, LayoutChangeEvent } from "react-native";
import { TextInput } from "react-native-gesture-handler";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    useAnimatedProps,
    runOnJS,
} from "react-native-reanimated";

const MIN_WIDTH = 36;
const PADDING = 3;

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

interface ResizableSliderBoxProps {
    min: number;
    max: number;
    step: number;
    initialValue: number;
    onValueSlided?: (value: number) => void;
    disabled?: boolean;
}

const Slider: React.FC<ResizableSliderBoxProps> = ({
    min,
    max,
    step,
    initialValue,
    onValueSlided,
    disabled = false,
}) => {
    const theme = useTheme();

    const offset = useSharedValue(0);
    const startOffset = useSharedValue(0);
    const maxOffset = useSharedValue(0);
    const [containerWidth, setContainerWidth] = useState(0);

    const previousValue = useSharedValue(initialValue);
    const currentValue = useSharedValue(initialValue);

    const pan = Gesture.Pan()
        .onBegin(() => {
            if (disabled) return;
            startOffset.value = offset.value; // store start position
        })
        .onChange((event) => {
            if (disabled) return;
            const totalOffset = startOffset.value + event.translationX;
            const clampedOffset = Math.max(0, Math.min(totalOffset, maxOffset.value));
            const rawValue = min + (clampedOffset / maxOffset.value) * (max - min);
            const steppedValue = Math.round((rawValue - min) / step) * step + min;
            const finalValue = Math.max(min, Math.min(max, steppedValue));

            currentValue.value = finalValue;
            offset.value = ((finalValue - min) / (max - min)) * maxOffset.value;
        })
        .onEnd(() => {
            if (disabled) return;
            if (previousValue.value !== currentValue.value) {
                console.info("[Slider] Slider value changed:", currentValue.value);
                previousValue.value = currentValue.value;

                if (onValueSlided) {
                    runOnJS(onValueSlided)(currentValue.value);
                }
            } else {
                console.info("[Slider] No change in value, not updating.");
            }
        });

    const sliderStyle = useAnimatedStyle(() => ({
        width: MIN_WIDTH + offset.value,
    }));

    const getStepPrecision = (step: number) => {
        const stepStr = step.toString();
        if (stepStr.indexOf(".") >= 0) {
            return Math.min(stepStr.split(".")[1].length, 4);
        }

        return 4;
    };
    const stepPrecision = getStepPrecision(step);

    const animatedProps = useAnimatedProps(() => ({
        text: Number(currentValue.value.toFixed(stepPrecision)).toString(),
        defaultValue: Number(currentValue.value.toFixed(stepPrecision)).toString(),
    }));

    useEffect(() => {
        if (containerWidth <= 0) return;

        const tmpMaxOffset = containerWidth - MIN_WIDTH - 2 * PADDING;
        maxOffset.value = tmpMaxOffset;

        const clampedInitial = Math.max(min, Math.min(max, initialValue));
        const initialOffset = ((clampedInitial - min) / (max - min)) * tmpMaxOffset;

        offset.value = initialOffset;
        currentValue.value = clampedInitial;
        previousValue.value = clampedInitial;

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [containerWidth, initialValue, min, max]);

    const onLayout = (event: LayoutChangeEvent) => {
        const { width } = event.nativeEvent.layout;
        setContainerWidth(width);
    };

    return (
        <View
            onLayout={onLayout}
            style={{
                width: "100%",
                height: "100%",
                justifyContent: "center",
                alignItems: "center",
            }}>
            <View
                style={{
                    width: containerWidth,
                    height: "100%",
                    backgroundColor: theme.current.colors.primary,
                    borderRadius: 12,
                    justifyContent: "center",
                    padding: PADDING,
                    ...shadowStyles.default,
                }}>
                <GestureDetector gesture={pan}>
                    <Animated.View
                        style={[
                            {
                                height: "100%",
                                backgroundColor: theme.current.colors.success,
                                opacity: 0.8,
                                borderRadius: 12,
                                position: "absolute",
                                left: 3,
                                justifyContent: "center",
                                alignItems: "flex-end",
                                paddingRight: 4,
                            },
                            sliderStyle,
                        ]}>
                        <AnimatedTextInput
                            animatedProps={animatedProps}
                            style={[
                                {
                                    textAlign: "center",
                                    fontSize: 14,
                                    color: theme.current.colors.textOnPrimary,
                                },
                            ]}
                            editable={false}
                        />
                    </Animated.View>
                </GestureDetector>
            </View>
        </View>
    );
};

export default Slider;
