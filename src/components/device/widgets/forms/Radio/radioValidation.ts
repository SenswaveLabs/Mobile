import type { RadioOption } from "./RadioForm";
import type { OptionInfo } from "@/contexts/custom/OperationFormProvider";

export const getRadioOptionErrors = (
    option: RadioOption,
    operationOptions: OptionInfo[],
    otherOptions: RadioOption[],
) => {
    let displayName = "";
    let optionName = "";
    let icon = "";
    if (
        typeof option?.displayName !== "string" ||
        !option.displayName.trim() ||
        option.displayName.length > 12 ||
        !/^[\p{L}\p{N}\p{M} -]+$/u.test(option.displayName)
    ) {
        displayName = "Use 1–12 letters, numbers, spaces or hyphens.";
    } else if (otherOptions.some((other) => other?.displayName === option.displayName)) {
        displayName = "Use a unique display name.";
    }
    if (
        typeof option?.optionName !== "string" ||
        !operationOptions.some((available) => available?.name === option.optionName)
    ) {
        optionName = "Choose an available operation option.";
    } else if (otherOptions.some((other) => other?.optionName === option.optionName)) {
        optionName = "This operation option is already used.";
    }
    if (
        typeof option?.icon !== "string" ||
        option.icon.length > 128 ||
        !/^[\p{L}\p{N}\p{M}-]+$/u.test(option.icon)
    ) {
        icon = "Choose a valid option icon.";
    }
    return { displayName, optionName, icon };
};

export const getRadioOptionsError = (options: RadioOption[], operationOptions: OptionInfo[]) => {
    if (options.length < 2) return "Add at least two options.";
    if (options.length > 10) return "Use at most 10 options.";
    for (let index = 0; index < options.length; index++) {
        const option = options[index];
        const errors = getRadioOptionErrors(
            option,
            operationOptions,
            options.filter((_, otherIndex) => index !== otherIndex),
        );
        const error = errors.displayName || errors.optionName || errors.icon;
        if (error) return error;
    }
    return "";
};
