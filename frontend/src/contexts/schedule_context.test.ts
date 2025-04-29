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
    it("filters out invalid dates", () => {
        const input: Event[][] = [[
            {
                "name": "Valid Event",
                "location": "Court 1",
                "start": "2025-04-11T11:00:00-05:00", 
                "end": "2025-04-11T21:30:00-05:00"
            },
            {
                "name": "Invalid Event",
                "location": "Court 1",
                "start": "invalid",
                "end": "invalid"
            }
        ]];
        const expected: ProcessedEvent[][] = [[
            {
            "name": "Valid Event",
            "bucket": 0,
            "start": DateTime.fromISO("2025-04-11T11:00:00-05:00").setZone('America/Chicago'),
            "end": DateTime.fromISO("2025-04-11T21:30:00-05:00").setZone('America/Chicago'),
            "color": "#808080"
            }
        ]];

        const result = process_buckets(input, 2);
        expect(result[0].length).toBe(expected[0].length);
        
        for (let key of Object.keys(result[0][0])) {
            if (key == "color") continue;
            if (key === 'name' || key === 'bucket' || key === 'start' || key === 'end') {
                expect(result[0][0][key]).toEqual(expected[0][0][key]);
            }
        }
    });

    it("assigns correct colors to all known event types", () => {
        const input: Event[][] = [[
            {
                "name": "Open Rec Basketball",
                "location": "Court 1",
                "start": "2025-04-11T11:00:00-05:00",
                "end": "2025-04-11T12:00:00-05:00"
            },
            {
                "name": "Open Rec Pickleball",
                "location": "Court 1",
                "start": "2025-04-11T12:00:00-05:00", 
                "end": "2025-04-11T13:00:00-05:00"
            },
            {
                "name": "Open Rec Badminton",
                "location": "Court 1",
                "start": "2025-04-11T13:00:00-05:00",
                "end": "2025-04-11T14:00:00-05:00"
            },
            {
                "name": "Open Rec Futsal",
                "location": "Court 1",
                "start": "2025-04-11T14:00:00-05:00",
                "end": "2025-04-11T15:00:00-05:00"
            },
            {
                "name": "Open Rec Volleyball",
                "location": "Court 1",
                "start": "2025-04-11T15:00:00-05:00",
                "end": "2025-04-11T16:00:00-05:00"
            },
            {
                "name": "Navy ROTC",
                "location": "Court 1",
                "start": "2025-04-11T16:00:00-05:00",
                "end": "2025-04-11T17:00:00-05:00"
            },
            {
                "name": "Army ROTC",
                "location": "Court 1",
                "start": "2025-04-11T17:00:00-05:00",
                "end": "2025-04-11T18:00:00-05:00"
            },
            {
                "name": "Open Rec pickleball / Badminton",
                "location": "Court 1",
                "start": "2025-04-11T18:00:00-05:00",
                "end": "2025-04-11T19:00:00-05:00"
            },
            {
                "name": "Open Rec pickleball/Badminton",
                "location": "Court 1",
                "start": "2025-04-11T19:00:00-05:00",
                "end": "2025-04-11T20:00:00-05:00"
            },
            {
                "name": "Open Rec Badminton / pickleball",
                "location": "Court 1",
                "start": "2025-04-11T20:00:00-05:00",
                "end": "2025-04-11T21:00:00-05:00"
            },
            {
                "name": "Open Rec Badminton/pickleball",
                "location": "Court 1",
                "start": "2025-04-11T21:00:00-05:00",
                "end": "2025-04-11T22:00:00-05:00"
            }
        ]];

        const result = process_buckets(input, 1);
        expect(result[0][0].color).toBe("#e8881e"); // Basketball orange
        expect(result[0][1].color).toBe("#008fd1"); // Pickleball blue
        expect(result[0][2].color).toBe("#008fd1"); // Badminton blue
        expect(result[0][3].color).toBe("#84d100"); // Futsal geen
        expect(result[0][4].color).toBe("#ebd3a3"); // Volleyball purple
        expect(result[0][5].color).toBe("hsl(240, 33%, 37%, 0.25)"); // Navy ROTC navy blue
        expect(result[0][6].color).toBe("hsl(57, 44%, 76%, 0.25)"); // Army ROTC yellow sand
        expect(result[0][7].color).toBe("#008fd1"); // pickelball / badminton blue
        expect(result[0][8].color).toBe("#008fd1"); // pickelball/badminton blue
        expect(result[0][9].color).toBe("#008fd1"); // badminton / pickelball blue
        expect(result[0][10].color).toBe("#008fd1"); // badminton/pickelball blue
    });

    it("assigns same color to duplicate events", () => {
        const input: Event[][] = [[
            {
                "name": "Duplicate Event",
                "location": "Court 1",
                "start": "2025-04-11T11:00:00-05:00",
                "end": "2025-04-11T12:00:00-05:00"
            }],
            [{
                "name": "Duplicate Event",
                "location": "Court 2",
                "start": "2025-04-11T11:00:00-05:00",
                "end": "2025-04-11T12:00:00-05:00"
            }]
        ];
        const result = process_buckets(input, 2);
        expect(result[0][0].color).toBe(result[1][0].color);
    });

    it("handles mixed scenarios correctly", () => {
        const input: Event[][] = [[
            {
                "name": "Open Rec Basketball",
                "location": "Court 1",
                "start": "2025-04-11T11:00:00-05:00",
                "end": "2025-04-11T12:00:00-05:00"
            },
            {
                "name": "Invalid Event",
                "location": "Court 1",
                "start": "invalid",
                "end": "invalid"
            },
            {
                "name": "Duplicate Event",
                "location": "Court 1",
                "start": "2025-04-11T13:00:00-05:00",
                "end": "2025-04-11T14:00:00-05:00"
            }],
            [{
                "name": "Duplicate Event",
                "location": "Court 2",
                "start": "2025-04-11T13:00:00-05:00",
                "end": "2025-04-11T14:00:00-05:00"
            }]
        ];
        const result = process_buckets(input, 2);
        expect(result[0].length).toBe(2); // Invalid event filtered out
        expect(result[0][0].color).toBe("#e8881e"); // Open Rec Backetball orange
        expect(result[0][1].color).toBe(result[1][0].color); // Duplicate events same color
    });
});
