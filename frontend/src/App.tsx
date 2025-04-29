import { useEffect, useState } from 'react'
import './App.css'
import { useSchedule } from './contexts/schedule_context'
import { DateTime } from 'luxon';
import Schedule from './schedule';
import { Facility, Gym } from './types/schedule';

function App() {
    const scheduleContext = useSchedule();

    const [date, _] = useState<DateTime>(DateTime.now().minus({ days: 2 }));

    useEffect(() => {
        scheduleContext.fetchSchedules(date);
    }, [date]);

    return <main>
        <h1>UWOpenRecRoster</h1>
        <div>
            <button className="btn">Courts</button>
            <button className="btn">Pools</button>
            <button className="btn">Mount Mendota</button>
            <button className="btn">Ice Rink</button>
            <button className="btn">Esports</button>
        </div>
        <div>
            <button className="btn">Prev</button>
            <p>This is a day</p>
            <button className="btn">Next</button>
        </div>
        <Schedule gym={Gym.bakke} facility={Facility.courts} date={date} />
    </main>
}

export default App
