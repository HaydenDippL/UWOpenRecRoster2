import { DateTime } from "luxon";
import { Event, ProcessedEvent } from "../types/schedule";
import { Facility } from "../types/schedule";
import { bucketify, process_buckets } from "./schedule_context";

describe("bucketify", () => {
    it("sorts into correct buckets", () => {
        const courts: Event[] = [
            {
                "name": "Open Rec Pickleball ",
                "location": "Court 1",
                "start": "2025-04-11T11:00:00",
                "end": "2025-04-11T21:30:00"
            },
            {
                "name": "Open Rec Badminton",
                "location": "Court 2",
                "start": "2025-04-11T11:00:00",
                "end": "2025-04-11T21:30:00"
            },
            {
                "name": "NIRSA National Basketball 2025",
                "location": "Courts 1 - 2",
                "start": "2025-04-11T11:00:00",
                "end": "2025-04-12T03:00:00"
            }
        ];
        const courts_buckets: Event[][] = [
            [
                {
                    "name": "Open Rec Pickleball ",
                    "location": "Court 1",
                    "start": "2025-04-11T11:00:00",
                    "end": "2025-04-11T21:30:00"
                },
                {
                    "name": "NIRSA National Basketball 2025",
                    "location": "Courts 1 - 2",
                    "start": "2025-04-11T11:00:00",
                    "end": "2025-04-12T03:00:00"
                }
            ],
            [
                {
                    "name": "Open Rec Badminton",
                    "location": "Court 2",
                    "start": "2025-04-11T11:00:00",
                    "end": "2025-04-11T21:30:00"
                },
                {
                    "name": "NIRSA National Basketball 2025",
                    "location": "Courts 1 - 2",
                    "start": "2025-04-11T11:00:00",
                    "end": "2025-04-12T03:00:00"
                }
            ]
        ];

        expect(bucketify(2, Facility.courts, courts)).toStrictEqual(courts_buckets);
    })
});

describe("process_buckets", () => {
    it("sorts/accumulates like buckets within 5 minutes", () => {
        const courts_buckets: Event[][] = [
            [
                {
                    "name": "Open Rec Pickleball ",
                    "location": "Court 1",
                    "start": "2025-04-11T11:00:00",
                    "end": "2025-04-11T21:30:00"
                },
                {
                    "name": "Open Rec Pickleball ",
                    "location": "Courts 1 - 2",
                    "start": "2025-04-11T21:30:00",
                    "end": "2025-04-12T22:00:00"
                },
                {
                    "name": "Open Rec Pickleball ",
                    "location": "Courts 1 - 2",
                    "start": "asdf",
                    "end": "2025-04-12T22:00:00"
                },
                {
                    "name": "Open Rec Pickleball ",
                    "location": "Courts 1",
                    "start": "2025-04-11T22:05:00",
                    "end": "2025-04-12T24:00:00"
                }
            ],
            [
                {
                    "name": "Open Rec Badminton",
                    "location": "Court 2",
                    "start": "2025-04-11T11:00:00",
                    "end": "2025-04-11T21:30:00"
                },
                {
                    "name": "Open Rec Pickleball ",
                    "location": "Courts 1 - 2",
                    "start": "2025-04-11T21:30:00",
                    "end": "2025-04-12T22:00:00"
                },
                {
                    "name": "Open Rec Pickleball ",
                    "location": "Courts 2",
                    "start": "2025-04-11T22:06:00",
                    "end": "2025-04-12T24:00:00"
                }
            ]
        ];
        const processed_buckets: ProcessedEvent[][] = [
            [
            {
                "name": "Open Rec Pickleball ",
                "bucket": 0,
                "start": DateTime.fromISO("2025-04-11T11:00:00", { zone: "utc" }).setZone("America/Chicago"),
                "end": DateTime.fromISO("2025-04-12T24:00:00", { zone: "utc" }).setZone("America/Chicago")
            }
            ],
            [
            {
                "name": "Open Rec Badminton",
                "bucket": 1,
                "start": DateTime.fromISO("2025-04-11T11:00:00", { zone: "utc" }).setZone("America/Chicago"),
                "end": DateTime.fromISO("2025-04-11T21:30:00", { zone: "utc" }).setZone("America/Chicago")
            },
            {
                "name": "Open Rec Pickleball ",
                "bucket": 1,
                "start": DateTime.fromISO("2025-04-11T21:30:00", { zone: "utc" }).setZone("America/Chicago"),
                "end": DateTime.fromISO("2025-04-12T22:00:00", { zone: "utc" }).setZone("America/Chicago")
            },
            {
                "name": "Open Rec Pickleball ",
                "bucket": 1,
                "start": DateTime.fromISO("2025-04-11T22:06:00", { zone: "utc" }).setZone("America/Chicago"),
                "end": DateTime.fromISO("2025-04-12T24:00:00", { zone: "utc" }).setZone("America/Chicago")
            }
            ]
        ];

        expect(process_buckets(courts_buckets, 2)).toStrictEqual(processed_buckets);
    })
});