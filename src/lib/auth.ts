import { type UserSession } from "./types";
import { DUMMY_USERS_MAP } from "./constants";

const DEFAULT_USER: UserSession = DUMMY_USERS_MAP["prajwalmadikai@gmail.com"];

export async function getUserFromSession(req: Request): Promise<UserSession> {
    const overrideEmail = req.headers.get("x-user-email");

    if (overrideEmail && DUMMY_USERS_MAP[overrideEmail])
        return DUMMY_USERS_MAP[overrideEmail];

    return DEFAULT_USER;
}

export function getDummyUser(email: string): UserSession | null {
    return DUMMY_USERS_MAP[email] ?? null;
}

export function getAllDummyUsers(): UserSession[] {
    return Object.values(DUMMY_USERS_MAP);
}