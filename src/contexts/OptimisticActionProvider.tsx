import React, {
    createContext,
    FC,
    ReactNode,
    startTransition,
    useContext,
    useOptimistic,
} from "react";

type ActionValue = boolean | number | string;

interface OptimisticActions {
    values: Record<string, ActionValue | undefined>;
    run: (identity: string, value: ActionValue, action: () => Promise<void>) => Promise<void>;
}

interface OptimisticActionProviderProps {
    children?: ReactNode;
}

const empty: OptimisticActions["values"] = {};
const Context = createContext<OptimisticActions | null>(null);

// Keep the optimistic hook above route Suspense boundaries: Fabric 0.81 mounts their fallback during a suspended render.
export const OptimisticActionProvider: FC<OptimisticActionProviderProps> = ({ children }) => {
    const [values, update] = useOptimistic(
        empty,
        (current, change: { identity: string; value: ActionValue | undefined }) => ({
            ...current,
            [change.identity]: change.value,
        }),
    );
    const run: OptimisticActions["run"] = (identity, value, action) => {
        let completion!: Promise<void>;
        startTransition(() => {
            update({ identity, value });
            completion = (async () => {
                try {
                    await action();
                } finally {
                    startTransition(() => update({ identity, value: undefined }));
                }
            })();
            return completion;
        });
        return completion;
    };

    return <Context.Provider value={{ values, run }}>{children}</Context.Provider>;
};

export const useOptimisticActions = () => {
    const context = useContext(Context);
    if (!context) throw new Error("OptimisticActionProvider is missing above the router");
    return context;
};
