import { useEffect, useState } from 'react'
import './App.css'
import { useSchedule } from './contexts/schedule_context'
import { DateTime } from 'luxon';
import Schedule from './schedule';
import { Facility, Gym } from './types/schedule';

type FocusedActivities = {
    "Open Rec Basketball": boolean,
    "Open Rec Volleyball": boolean,
    "Open Rec Badminton/Pickleball": boolean,
    "Open Rec Futsal": boolean,
    "Open Rec Swim": boolean,
    "Open Rec Gaming": boolean,
    "Open Rec Skate": boolean 
};

function createEmptyFocusedActivities(): FocusedActivities {
    return {
        "Open Rec Basketball": false,
        "Open Rec Volleyball": false,
        "Open Rec Badminton/Pickleball": false,
        "Open Rec Futsal": false,
        "Open Rec Swim": false,
        "Open Rec Gaming": false,
        "Open Rec Skate": false 
    };
}

function App() {
    const scheduleContext = useSchedule();

    const [today, setToday] = useState<DateTime>(DateTime.now());
    const [facility, setFacility] = useState<Facility>(Facility.courts);
    const [focusedActivities, setFocusedActivities] = useState<FocusedActivities>(createEmptyFocusedActivities());

    const yesterday = today.minus({ days: 1 });
    const tomorrow = today.plus({ days: 1 });

    useEffect(() => {
        scheduleContext.fetchSchedules(today);
    }, [today]);

    function goTomorrow(): void {
        setToday(tomorrow);
    }

    function goYesterday(): void {
        setToday(yesterday);
    }

    function handleFacilityChange(nextFacility: Facility): void {
        if (nextFacility == facility) {
            return;
        }

        setFocusedActivities(createEmptyFocusedActivities());
        setFacility(nextFacility);
    }

    function toggleFocusedActivity(activity: keyof FocusedActivities): void {
        setFocusedActivities(prev => {
            return {
                ...prev,
                [activity]: !prev[activity]
            };
        });
    }

    let openRecActivities: string[];
    if (facility == Facility.pool) {
        openRecActivities = ["Open Rec Swim"];
    } else if (facility == Facility.esports) {
        openRecActivities = ["Open Rec Gaming"];
    } else if (facility == Facility.ice_rink) {
        openRecActivities = ["Open Rec Skate"];
    } else { // courts
        openRecActivities = ["Open Rec Basketball", "Open Rec Volleyball", "Open Rec Badminton/Pickleball", "Open Rec Futsal"];
    }

    return <main>
        <h1>UWOpenRecRoster</h1>
        <div>
            <button className="btn" onClick={() => handleFacilityChange(Facility.courts)}>Courts</button>
            <button className="btn" onClick={() => handleFacilityChange(Facility.pool)}>Pools</button>
            <button className="btn" onClick={() => handleFacilityChange(Facility.mount_mendota)}>Mount Mendota</button>
            <button className="btn" onClick={() => handleFacilityChange(Facility.ice_rink)}>Ice Rink</button>
            <button className="btn" onClick={() => handleFacilityChange(Facility.esports)}>Esports</button>
        </div>
        <div className="flex flex-row ">
            <button className="btn" onClick={goYesterday}>
                { "< " + yesterday.toFormat("cccc") }
            </button>
            <p>{ today.toFormat("cccc, LLL d")}</p>
            <button className="btn" onClick={goTomorrow}>
                { tomorrow.toFormat("cccc") + " >" }
            </button>
        </div>
        <div>{
            openRecActivities.map((openRecActivity, i) => {
                return <div key={i} className="flex flex-row">
                    <input 
                        type="checkbox" 
                        className="toggle toggle-primary"
                        checked={focusedActivities[openRecActivity as keyof FocusedActivities]}
                        onChange={() => toggleFocusedActivity(openRecActivity as keyof FocusedActivities)}
                    />
                    <p>{openRecActivity}</p>
                </div>
            })
        }</div>
        <Schedule gym={Gym.bakke} facility={facility} date={today} />
        <div className="h-4" />
        <Schedule gym={Gym.nick} facility={facility} date={today} />
    </main>
}

export default App
