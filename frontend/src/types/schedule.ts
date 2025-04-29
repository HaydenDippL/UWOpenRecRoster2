import { DateTime } from "luxon";


export enum Gym {
    bakke = "bakke",
    nick = "nick",
}

export enum Facility {
    courts = "courts",
    pool = "pool",
    esports = "esports",
    mount_mendota = "mount_mendota",
    ice_rink = "ice_rink",
}

// Schedule response json format from backend
export interface ScheduleResp {
    bakke: Facilities;
    nick: Facilities;
}

export interface Facilities {
    courts: Event[] | null;
    pool: Event[] | null;
    esports: Event[] | null;
    mount_mendota: Event[] | null;
    ice_rink: Event[] | null;
}

export interface Event {
    name: string;
    location: string;
    start: string;                  // "2025-04-08T13:30:00"
    end: string;                    // "2025-04-08T13:30:00"
}

// objects stored after processing
export interface Schedules {
    bakke: ProcessedFacilities;
    nick: ProcessedFacilities;
}

export interface ProcessedFacilities {
    courts: ProcessedEvent[];
    pool: ProcessedEvent[];
    esports: ProcessedEvent[];
    mount_mendota: ProcessedEvent[];
    ice_rink: ProcessedEvent[];
}

export interface ProcessedEvent {
    name: string;
    bucket: number;
    start: DateTime;
    end: DateTime;
    color: string;
}
