export class SimpleResult {
    isSuccess: boolean;
    errorMessage: string | null;

    constructor(isSuccess: boolean, errorMessage: string | null = null) {
        this.isSuccess = isSuccess;
        this.errorMessage = errorMessage;
    }

    static success(): SimpleResult {
        return new SimpleResult(true, null);
    }

    static failure(errorMessage: string): SimpleResult {
        return new SimpleResult(false, errorMessage);
    }
}

export class Result<T = any> {
    data: T | null;
    isSuccess: boolean;
    errorMessage: string | null;

    constructor(isSuccess: boolean, data: T | null = null, errorMessage: string | null = null) {
        this.isSuccess = isSuccess;
        this.data = data;
        this.errorMessage = errorMessage;
    }

    static success<T>(data: T): Result<T> {
        return new Result<T>(true, data, null);
    }

    static failure<T>(errorMessage: string): Result<T> {
        return new Result<T>(false, null, errorMessage);
    }

    static failureWithData<T>(errorMessage: string, data: T): Result<T> {
        return new Result<T>(false, data, errorMessage);
    }
}
