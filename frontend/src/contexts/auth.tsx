import React, { useState, useContext, createContext, useEffect } from 'react';

interface AuthContextType {
    userId: string | null;
    sessionId: string | null;
    setAndStoreUserId: (id: string) => void;
    setSessionId: (id: string) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

/**
 * Gets the AuthContext while in a provided node
 * 
 * @returns AuthContext
 * @throws error if not used within a AuthProvider
 */
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context
}

/**
 * Manages auth for the users. Automatically searches for existing userId in
 * localStorage on mount, set userId in localStorage when changed, and tracks
 * sessionId.
 * 
 * @param param0 
 * @returns 
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [userId, setUserId] = useState<string | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);

    useEffect(() => {
        const storedUserId: string | null = localStorage.getItem("userId");
        if (storedUserId) {
            setUserId(storedUserId);
        }
    }, []);

    /**
     * Updates the userId variable and attempts to set 'userId' in localstorage
     * 
     * @param userId 
     */
    const setAndStoreUserId = (userId: string) => {
        if (!userId) {
            return
        }

        try {
            localStorage.setItem("userId", userId)
        } catch (error) {
            console.error("Could not store userId in localStorage:", error);
        }

        setUserId(userId);
    }

    const value = {
        userId,
        sessionId,
        setAndStoreUserId,
        setSessionId,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}