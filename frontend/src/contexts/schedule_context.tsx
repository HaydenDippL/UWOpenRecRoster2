import React, { useState, useContext, createContext } from "react";
import { Gym, Facility, ScheduleResp, Event, ProcessedEvent, Schedules, ProcessedFacilities } from "../types/schedule";
import { DateTime } from "luxon";
import Cookies from "js-cookie";

interface ScheduleContextType {
    schedules: Schedules | null;
    setSchedules: (resp: Schedules) => void;
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
    const [schedules, setSchedules] = useState<Schedules | null>(null);

    /**
     * Fetches the schedules from the GO backend for the given date
     * 
     * @param date of the schedules to be fetched
     * @returns the schedules for the given date
     * @throws error if the request fails
     */
    const fetchSchedules = async(date: DateTime): Promise<ScheduleResp | null> => {
        setSchedules(null);

        const formatedDate: string = date.toFormat("yyyy-MM-dd");
    
        const resp = await fetch(`http://localhost:8001/schedule?date=${formatedDate}`);
    
        if (resp.status !== 200) {
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
        const processed_schedules: Schedules = process_schedules(schedules, date);
        setSchedules(processed_schedules);
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

/**
 * Processes and parses all of the schedules from a schedule request. Validates based on the
 * date and splits the events on the lane/court buckets they belong to. Fills buckets with
 * no events where there are gaps in the schedule.
 * 
 * @param scheduleResp Raw schedule from GO backend
 * @param date of the schedule
 * @returns Schedules object with the schedule for all facilities in the Bakke and Nick
 */
export function process_schedules(scheduleResp: ScheduleResp, date: DateTime): Schedules {
    const bakke_events = Object.values(Facility).reduce((acc, facility) => {
        if (scheduleResp.bakke[facility] !== null) {
            acc[facility] = process_events(scheduleResp.bakke[facility], Gym.bakke, facility, date);
        }

        return acc;
    }, {} as ProcessedFacilities);

    const nick_events = Object.values(Facility).reduce((acc, facility) => {
        if (scheduleResp.nick[facility] !== null) {
            acc[facility] = process_events(scheduleResp.nick[facility], Gym.nick, facility, date);
        }

        return acc;
    }, {} as ProcessedFacilities);

    const schedules = {
        bakke: bakke_events,
        nick: nick_events
    }

    return schedules;
}

/**
 * Process all events for a given facility
 * 
 * @param events the events
 * @param gym the gym the events belong to
 * @param facility the facility the events belong to
 * @param date of the schedule
 * @returns The processed events that have been accumulated, validated, and buckified
 */
export function process_events(events: Event[], gym: Gym, facility: Facility, date: DateTime): ProcessedEvent[] {
    // Find number of buckets for gym/facility
    let num_buckets: number;
    if (gym === Gym.bakke) {
        if ([Facility.courts, Facility.pool].includes(facility)) num_buckets = 8;
        else num_buckets = 1;
    } else {
        if (facility === Facility.pool) num_buckets = 20;
        else if (facility === Facility.courts) num_buckets = 8;
        else num_buckets = 0;
    }

    if (num_buckets === 0) {
        return [];
    }

    // First we need to put events into their lane/court buckets
    const buckets_unprocessed: Event[][] = bucketify(num_buckets, facility, events);

    // map buckets of events to processedEvents and accumulate like events within 5 minutes of start/end
    const buckets_processed: ProcessedEvent[][] = process_buckets(buckets_unprocessed, num_buckets);

    // add no events ("No Event Scheduled") where appropriate
    const buckets_processed_and_filled: ProcessedEvent[][] = add_no_events(buckets_processed, date)

    // put them back into one array for react to process
    const processed_events: ProcessedEvent[] = [];
    buckets_processed_and_filled.forEach(bucket => {
        bucket.forEach(event => {
            processed_events.push(event);
        });
    });

    return processed_events;
}

/**
 * Puts the events into corresponding buckets based on which lanes/courts they are on. For example:
 *  "Court 1" goes into the 0th bucket. "Court 1-3" goes into the 0th through 2nd bucket. "Pool"
 *  with not lane indication is all of the buckets.
 * 
 * @param num_buckets The number of buckets to sort the events into (the number of lanes/courts/walls)
 * @param facility The facility (pool/courts)
 * @param events The events to be sorted
 * @returns The buckets with all their corresponding events
 */
export function bucketify(num_buckets: number, facility: Facility, events: Event[]) {
    const buckets: Event[][] = Array.from({ length: num_buckets }, () => []);
    const search_word_singular: string = Facility.courts == facility ? "court" : "lane";
    const search_word_plural: string = search_word_singular + 's';
    if (num_buckets > 1) {
        events.forEach(event => {
            let start_bucket: number;
            let end_bucket: number;
            const location: string = event.location.toLowerCase();
            const indexOfPlural = location.indexOf(search_word_plural);
            const indexOfSingular = location.indexOf(search_word_singular);
            if (indexOfPlural > -1) { // range of buckets
                const [start_bucket_raw, end_bucket_raw] = location
                    .slice(indexOfPlural + search_word_plural.length)
                    .trim()
                    .split("-");
                
                start_bucket = parseInt(start_bucket_raw.trim()) - 1;
                end_bucket = parseInt(end_bucket_raw.trim());
            } else if (indexOfSingular > -1) { // single bucket
                const start_bucket_raw = location
                    .slice(indexOfSingular + search_word_singular.length)
                    .trim();
                
                start_bucket = parseInt(start_bucket_raw) - 1;
                end_bucket = start_bucket + 1
            } else { // all buckets
                start_bucket = 0;
                end_bucket = num_buckets;
            }


            if (isNaN(start_bucket) || isNaN(end_bucket) ||
                start_bucket < 0 || start_bucket >= num_buckets ||
                end_bucket <= start_bucket || end_bucket > num_buckets
            ) {
                return; // continue
            }

            for (let b = start_bucket; b < end_bucket && b < num_buckets; b++) {
                buckets[b].push(event);
            }
        })
    } else {
        buckets.push(events);
    }

    return buckets
}

/**
 * Validates the items in each bucket based on valid dates, parses the dates, sorts the dates, accumulates
 * matching events in the same bucket the start/end within 5 minutes of each other.
 * 
 * @param buckets_unprocessed unprocessed buckets
 * @param num_buckets number of buckets
 * @returns processed buckets that have been validated, sorted, and accumulated
 */
export function process_buckets(buckets_unprocessed: Event[][], num_buckets: number): ProcessedEvent[][] {
    const buckets_processed: ProcessedEvent[][] = Array.from({ length: num_buckets }, () => []);
    buckets_unprocessed.forEach((bucket, i) => {
        buckets_processed[i] = bucket
            .filter(event => {
                const start_time = DateTime.fromISO(event.start);
                const end_time = DateTime.fromISO(event.end);
                return start_time.isValid && end_time.isValid;
            })
            .map(event => {
                const start_time = DateTime.fromISO(event.start, { zone: "UTC" }).setZone("America/Chicago");
                const end_time = DateTime.fromISO(event.end, { zone: "UTC" }).setZone("America/Chicago");
                return {
                    name: event.name,
                    bucket: i,
                    start: start_time,
                    end: end_time,
                } as ProcessedEvent;
            })
            .map(event => {
                const color = map_colors(event);
                return {
                    ...event,
                    color: color
                };
            });
    });

    return buckets_processed;
}

/**
 * Adds no events ("No Event Scheduled" events) to the buckets in the gaps of events.
 * 
 * @param buckets to have no events added
 * @param date the date of the schedule
 * @returns the buckets with all gaps filled with no events
 */
export function add_no_events(buckets: ProcessedEvent[][], date: DateTime): ProcessedEvent[][] {
    const sixAm: DateTime = date.setZone("America/Chicago", { keepLocalTime: true }).set({ hour: 6, minute: 0, second: 0, millisecond: 0 });
    const midnight: DateTime = sixAm.plus({ hours: 18 });

    function create_no_event(bucket: number, start: DateTime, end: DateTime): ProcessedEvent {
        return {
            name: "No Event Scheduled",
            bucket: bucket,
            start: start,
            end: end,
            color: "rgb(102, 103, 105)"
        } as ProcessedEvent;
    }

    return buckets.map((bucket, b) => {
        if (bucket.length == 0) {
            return [create_no_event(b, sixAm, midnight)];
        }

        // ends at 6am for looping logic below on the case of the first event
        let prevEvent: ProcessedEvent = create_no_event(b, sixAm, sixAm);

        return bucket.reduce((acc, event, i) => {
            const newEvents: ProcessedEvent[] = [];;

            // if gap exists between last event and this event, add a no event
            if (event.start > prevEvent.end) {
                newEvents.push(create_no_event(b, prevEvent.end, event.start));
            }

            // add event
            newEvents.push(event);

            // if this is the last event and it ends before midnight, add a no event
            if (i + 1 == bucket.length && event.end < midnight) {
                newEvents.push(create_no_event(b, event.end, midnight));
            }

            prevEvent = event;
            return [...acc, ...newEvents];
        }, [] as ProcessedEvent[]);
    });
}

const colors: { [key: string]: string } = {
    "open rec basketball": "#e8881e", // orange
    "open rec badminton / pickleball": "#008fd1", // blue
    "open rec badminton/pickleball": "#008fd1", // blue
    "open rec pickleball / badminton": "#008fd1", // blue
    "open rec pickleball/badminton": "#008fd1", // blue
    "open rec badminton": "#008fd1", // blue
    "open rec pickleball": "#008fd1", // blue
    "open rec volleyball": "#ebd3a3", // tan
    "open rec futsal": "#84d100", // green
    "army rotc": "hsl(57, 44%, 76%, 0.25)", // army sand
    "navy rotc": "hsl(240, 33%, 37%, 0.25)", // navy blue
}

export function map_colors(event: ProcessedEvent) {
    const event_name: string = event.name.trim().toLowerCase().replace(/\s+/g, ' ');
    if (colors[event_name]) {
        return colors[event_name];
    }

    const hue: number = Math.floor(Math.random() * 360);
    const saturation: number = Math.floor(Math.random() * 30) + 20;
    const light: number = Math.floor(Math.random() * 10) + 30;
    const opacity: number = 0.25;
    const hsl: string = `hsl(${hue}, ${saturation}%, ${light}%, ${opacity})`;

    colors[event_name] = hsl;
    return hsl;
}