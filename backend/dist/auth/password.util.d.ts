export declare function hashPassword(password: string): string;
export declare function verifyPassword(password: string, storedValue: string): boolean;
export declare function generateSessionToken(): string;
export declare function hashSessionToken(token: string): string;
