import React, { useState, useContext, createContext } from "react";
import { ScheduleResp } from "../types/schedule";
import { DateTime } from "luxon";
import Cookies from "js-cookie";

interface ScheduleContextType {
    schedules: ScheduleResp | null;
    setSchedules: (resp: ScheduleResp) => void;
    fetchSchedules: (date: DateTime) => Promise<ScheduleResp | null>
}

const ScheduleContext = createContext<ScheduleContextType | null>(null);

/**
 * Gets the ScheduleContext while in a provided node
 * 
 * @returns ScheduleContext
 * @throws error if not used within a ScheduleProvider
 */
export function useSchedule(): ScheduleContextType {
    const context = useContext(ScheduleContext);
    if (!context) {
        throw new Error("useSchedule must be used within an ScheduleProvider");
    }
    return context;
}
 
/**
 * Manages the current schedule of the app. Allows users to call context.fetchSchedule()
 * to get a new schedule. Will automatically update the schedules state. If schedules
 * response return new credentials, they are automatically handed in auth.
 * 
 * @param param0 react children to be provided the context to
 * @returns 
 */
export function ScheduleProvider({ children }: { children: React.ReactNode }) {
    const [schedules, setSchedules] = useState<ScheduleResp | null>(null);

    /**
     * Fetches the schedules from the GO backend for the given date
     * 
     * @param date of the schedules to be fetched
     * @returns the schedules for the given date
     * @throws error if the request fails
     */
    const fetchSchedules = async(date: DateTime): Promise<ScheduleResp | null> => {
        const formatedDate: string = date.toFormat("yyyy-MM-dd");
    
        const resp = await fetch(`http://localhost:8001/schedule?date=${formatedDate}`);
    
        if (resp.status !== 400) {
            console.error("Failed to fetch schedules...");
            return null;
        }
    
        // If backend sends back userId or sessionId, set them in cookies
        const jsCookiesDefaultSettings: Cookies.CookieAttributes = { path: "/schedule", secure: true, sameSite: "Strict" };
        const userId = resp.headers.get("X-User-Id");
        if (userId) {
            const one_thousand_days = 1000;
            Cookies.set("userId", userId, { expires: one_thousand_days, ...jsCookiesDefaultSettings });
        }
        const sessionId = resp.headers.get("X-Session-Id");
        if (sessionId) {
            const one_hour = 1 / 24;
            Cookies.set("sessionId", sessionId, { expires: one_hour, ...jsCookiesDefaultSettings });
        }
    
        const schedules: ScheduleResp = await resp.json();
        setSchedules(schedules);
        return schedules;
    }

    const value = {
        schedules,
        setSchedules,
        fetchSchedules
    };

    return (
        <ScheduleContext.Provider value={value}>
            {children}
        </ScheduleContext.Provider>
    );
}