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