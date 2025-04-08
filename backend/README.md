# UWOpenRecRoster2-Backend

Backend written in GO to fetch schedules, memoize schedules, and track user activity.

## Endpoint

`GET /schedule` with the a date parameter of the form `"yyyy-mm-dd"`. This will return the schedules of the Nick and Bakke for all facilities - courts, pools, climbing walls, esports, and ice rink. A query to fetch 2025 April Fools schedule looks like this

`GET /schedule?date=2025-04-01`

It returns data in the following form. **NOTE** all dates are ISO DateTimes (RFC 3339). **NOTE** that both the Bakke and Nick return a fields for all facilities and potentially contain null if no events are scheduled or if that gym does not have said facility.

```
{
    Bakke: {
        Courts: [
            {
                location: "Court 1",
                eventName: "Open Rec Basketball",
                start: "2025-03-11T06:00:00Z",
                end: "2025-03-11T10:00:00Z"
            }
            ...
        ],
        Pool: [
            {
                location: "Lane 1",
                eventName: "Open Rec Swim",
                start: "2025-03-11T06:00:00Z",
                end: "2025-03-11T10:00:00Z"
            }
        ]
        ...
    },
    Nick: {
        Courts: [
            ...
        ],
        Pool: [
            ...
        ]
        ...
    }
}
```

## Code 

This project is separated into four main files: `logging.go`, `memo.go`, `schedule.go`, and `main.go`. 

- `schedule.go` has a function `fetchSchedules(date)` which actually goes and requests the schedules from the RecWell APIs.
- `memo.go` is responsible for taking a schedule and memoizing it in the postgres database. The `schedules` table only contains memoized schedule responses for a given query if the date within three days prior or two weeks in the future: `[-3 days, 14 days]. When fetching a schedule, the schedule becomes stale if it is over an hour old and it will delete that schedule from the table. 
- `logging.go` is responsible for logging user activity into the `users`, `sessions`, and `queries` databases for user analytics purposes. The `log_event()` function takes a user-id (possible empty), session-id (possibly empty) and a query date. It will ensure the user-id is valid or create one and will do the same for the session-id while ensuring that the session-id belongs to the user-id. With these ids it will log the queried date. If a new session-id or user-id is generated, it returns it in the return tuple.
- `main.go` it the heart of the application and where the endpoints, middleware, and main function lay. Interfaces with `schedules.go`, `memo.go`, and `logging.go`. 

