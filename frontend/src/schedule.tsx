import { DateTime } from "luxon";
import { useSchedule } from "./contexts/schedule_context";
import { ProcessedEvent, Gym, Facility, ProcessedFacilities } from "./types/schedule";

interface ScheduleProps {
    gym: Gym;
    facility: Facility;
    date: DateTime;
}

export default function Schedule({ gym, facility, date }: ScheduleProps) {
    const { schedules } = useSchedule();

    if (gym === Gym.nick && [Facility.esports, Facility.mount_mendota, Facility.ice_rink].includes(facility)) {
        // TODO: does not exist
        return <></>;
    }

    if (!schedules) {
        // TODO: skeleton loading
        return <></>;
    }

    const schedule: ProcessedFacilities = schedules[gym];
    const events: ProcessedEvent[] = schedule[facility];

    if (!events) {
        // TODO: gym closed
        return <></>
    }

    const MINUTES_IN_SCHEDULE = 18 * 60;
    const sixAm = date.setZone("America/Chicago", { keepLocalTime: true }).set({ hour: 6, minute: 0, second: 0, millisecond: 0 });
    
    const num_buckets: number = events.reduce((acc, curr) => {
        return Math.max(acc, curr.bucket);
    }, 0) + 1;
    const width: string = `${100 / num_buckets}%`;;

    return <svg width="400" height="800">
        {events.map((event, i) => {
            const start_minute: number = event.start.diff(sixAm, "minutes").toObject().minutes || 0;
            const end_minute: number = event.end.diff(sixAm, "minutes").toObject().minutes || 0;
            return (
                <rect
                    key={i}
                    x={`${100 * event.bucket / 8}%`}
                    y={`${100 * start_minute / MINUTES_IN_SCHEDULE}%`}
                    width={width}
                    height={`${100 * (end_minute - start_minute) / MINUTES_IN_SCHEDULE}%`}
                    onClick={() => console.log({
                        start: event.start.toISO(),
                        end: event.end.toISO(),
                        name: event.name,
                        bucket: event.bucket
                    })}
                    fill={event.color}
                />
            );
        })}
    </svg>
}