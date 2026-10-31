import React, {
    createContext,
    useEffect,
    useContext,
    PropsWithChildren,
    FC,
    useState,
    useRef,
} from "react";
import { useHomes } from "../domain/HomeProvider";
import {
    AutomationDto,
    AutomationConditionDraft,
    AutomationResultDraft,
    AutomationSession,
} from "@/types/AutomationsTypes";

interface AutomationContextProps {
    session: AutomationSession | undefined;
    beginSession: (homeId: string, automation?: AutomationDto) => string;
    clearSession: (token: string) => void;
    isCurrentSession: (token: string) => boolean;
    appendCondition: (token: string, value: AutomationConditionDraft) => boolean;
    appendResult: (token: string, value: AutomationResultDraft) => boolean;
    removeDraftCondition: (token: string, index: number) => boolean;
    removeDraftResult: (token: string, index: number) => boolean;
}

const AutomationContext = createContext<AutomationContextProps>({
    session: undefined,
    beginSession: () => "",
    clearSession: () => {},
    isCurrentSession: () => false,
    appendCondition: () => false,
    appendResult: () => false,
    removeDraftCondition: () => false,
    removeDraftResult: () => false,
});

export const useAutomation = () => useContext(AutomationContext);

const AutomationProvider: FC<PropsWithChildren> = ({ children }) => {
    const homes = useHomes();
    const [session, setSession] = useState<AutomationSession | undefined>();
    const sessionRef = useRef<AutomationSession | undefined>(undefined);
    const nextToken = useRef(0);
    const currentHomeRef = useRef(homes.current);
    currentHomeRef.current = homes.current;
    const homeId = currentHomeRef.current?.id;

    const currentSession = (token: string) => {
        const current = sessionRef.current;
        const currentHome = currentHomeRef.current;
        if (!current || current.token !== token || current.homeId !== currentHome?.id)
            return undefined;
        if (
            current.automationId === undefined &&
            currentHome?.isOwner !== true &&
            currentHome?.canManage !== true
        )
            return undefined;
        return current;
    };

    const updateSession = (next: AutomationSession) => {
        sessionRef.current = next;
        setSession(next);
    };

    const beginSession = (requestedHomeId: string, automation?: AutomationDto): string => {
        const currentHome = currentHomeRef.current;
        if (!requestedHomeId || currentHome?.id !== requestedHomeId) return "";
        if (
            automation
                ? automation.homeId !== requestedHomeId
                : currentHome.isOwner !== true && currentHome.canManage !== true
        )
            return "";

        const token = `automation-session-${++nextToken.current}`;
        updateSession({
            token,
            homeId: requestedHomeId,
            ...(automation && { automationId: automation.id }),
            conditions: automation?.conditions?.slice() ?? [],
            results: automation?.results?.slice() ?? [],
        });
        return token;
    };

    const clearSession = (token: string) => {
        if (sessionRef.current?.token !== token) return;
        sessionRef.current = undefined;
        setSession(undefined);
    };

    const isCurrentSession = (token: string) => Boolean(currentSession(token));

    const appendCondition = (token: string, value: AutomationConditionDraft) => {
        const current = currentSession(token);
        if (!current) return false;
        const owner = currentHomeRef.current?.isOwner === true;
        if (current.automationId !== undefined ? !owner : current.conditions.length >= 7)
            return false;
        updateSession({ ...current, conditions: [...current.conditions, value] });
        return true;
    };

    const appendResult = (token: string, value: AutomationResultDraft) => {
        const current = currentSession(token);
        if (!current) return false;
        const owner = currentHomeRef.current?.isOwner === true;
        if (current.automationId !== undefined ? !owner : current.results.length >= 7) return false;
        updateSession({ ...current, results: [...current.results, value] });
        return true;
    };

    const removeDraftCondition = (token: string, index: number) => {
        const current = currentSession(token);
        if (
            !current ||
            current.automationId !== undefined ||
            !Number.isInteger(index) ||
            index < 0 ||
            index >= current.conditions.length
        )
            return false;
        updateSession({
            ...current,
            conditions: current.conditions.filter((_, rowIndex) => rowIndex !== index),
        });
        return true;
    };

    const removeDraftResult = (token: string, index: number) => {
        const current = currentSession(token);
        if (
            !current ||
            current.automationId !== undefined ||
            !Number.isInteger(index) ||
            index < 0 ||
            index >= current.results.length
        )
            return false;
        updateSession({
            ...current,
            results: current.results.filter((_, rowIndex) => rowIndex !== index),
        });
        return true;
    };

    useEffect(() => {
        const current = sessionRef.current;
        const currentHome = currentHomeRef.current;
        if (
            current &&
            (current.homeId !== homeId ||
                (current.automationId === undefined &&
                    currentHome?.isOwner !== true &&
                    currentHome?.canManage !== true))
        ) {
            sessionRef.current = undefined;
            setSession(undefined);
        }
    }, [homeId, homes.current?.isOwner, homes.current?.canManage]);

    return (
        <AutomationContext.Provider
            value={{
                session,
                beginSession,
                clearSession,
                isCurrentSession,
                appendCondition,
                appendResult,
                removeDraftCondition,
                removeDraftResult,
            }}>
            {children}
        </AutomationContext.Provider>
    );
};

export default AutomationProvider;
