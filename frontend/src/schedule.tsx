import { DateTime } from "luxon";
import { useSchedule } from "./contexts/schedule_context";
import { ProcessedEvent, Gym, Facility, ProcessedFacilities } from "./types/schedule";
import { FocusedActivities } from "./App";

interface ScheduleProps {
    gym: Gym;
    facility: Facility;
    date: DateTime;
    focusedActivities: FocusedActivities
}

export default function Schedule({ gym, facility, date, focusedActivities }: ScheduleProps) {
    const { schedules } = useSchedule();

    if (gym === Gym.nick && [Facility.esports, Facility.mount_mendota, Facility.ice_rink].includes(facility)) {
        // TODO: does not exist
        return <></>;
    }

    const times = ["8:00 AM", "10:00 AM", "12:00 PM", "2:00 PM", "4:00 PM", "6:00 PM", "8:00 PM", "10:00 PM"];

    const svg_width: number = 400;
    const svg_height: number = 800;

    const schedule: ProcessedFacilities | null = schedules ? schedules[gym] : null;
    const events: ProcessedEvent[] | null = schedule ? schedule[facility] : null;

    const MINUTES_IN_SCHEDULE = 18 * 60;
    const sixAm = date.setZone("America/Chicago", { keepLocalTime: true }).set({ hour: 6, minute: 0, second: 0, millisecond: 0 });
    
    const num_buckets: number = (events || []).reduce((acc, curr) => {
        return Math.max(acc, curr.bucket);
    }, 0) + 1;
    const rect_width: string = `${100 / num_buckets}%`;

    const focusMode: boolean = Object.values(focusedActivities).some(bool => bool);

    return <div className={`relative w-[${svg_width}px] h-[${svg_height}px] ml-24`}>
        {schedule == null && (
            <div className="absolute inset-0 w-full h-full skeleton" />
        )}
        <svg
            className="absolute inset-0 w-full h-full overflow-visible"
            width={svg_width}
            height={svg_height}
        >
            {events && events.map((event, i) => {
                const start_minute: number = event.start.diff(sixAm, "minutes").toObject().minutes || 0;
                const end_minute: number = event.end.diff(sixAm, "minutes").toObject().minutes || 0;

                // Use to group the pickleball and badminton open rec events into one for the grayscale filter...
                let logicalEventName: string;
                if (event.name.includes("Open Rec") && (event.name.includes("Badminton") || event.name.includes("Pickleball"))) {
                    logicalEventName = "Open Rec Badminton/Pickleball";
                } else {
                    logicalEventName = event.name;
                }

                const grayscaleFilterClass: string = !focusMode || focusedActivities[logicalEventName as keyof FocusedActivities] ? "" : "grayscale";

                return (
                    <rect
                        key={i}
                        x={`${100 * event.bucket / 8}%`}
                        y={`${100 * start_minute / MINUTES_IN_SCHEDULE}%`}
                        width={rect_width}
                        height={`${100 * (end_minute - start_minute) / MINUTES_IN_SCHEDULE}%`}
                        onClick={() => console.log({
                            start: event.start.toISO(),
                            end: event.end.toISO(),
                            name: event.name,
                            bucket: event.bucket
                        })}
                        fill={event.color}
                        className={grayscaleFilterClass}
                    />
                );
            })}
            {times.map((time, i) => {
                const y: number = 100 * (i + 1) / 9
                return <g key={i}>
                    <rect
                        x="0%"
                        y={`${y}%`}
                        width="100%"
                        height="0.5%"
                        fill="hsla(0, 1.80%, 11.20%, 0.35)"
                    />
                    <text
                        x="-10"
                        y={`${y}%`}
                        dominantBaseline="central"
                        textAnchor="end"
                        className="text-sm fill-current"
                    >
                        { time }
                    </text>
                </g>
            })}
        </svg>
    </div>
}