interface AccessibilityActionEvent {
    nativeEvent: { actionName: string };
}

export const widgetRemovalAccessibility = (onRemove?: () => void) =>
    onRemove
        ? {
              accessibilityActions: [{ name: "longpress", label: "Remove widget from dashboard" }],
              onAccessibilityAction: (event: AccessibilityActionEvent) => {
                  if (event.nativeEvent.actionName === "longpress") onRemove();
              },
          }
        : {};
