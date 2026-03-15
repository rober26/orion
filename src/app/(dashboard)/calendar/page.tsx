"use client";
import { useState, useEffect } from "react";
import { addMonths, subMonths } from "date-fns";
import { getCalendarDays } from "@/src/lib/calendar-utils";
import CalendarHeader from "@/src/components/calendar/CalendarHeader";
import CalendarGrid from "@/src/components/calendar/CalendarGrid";

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState([]);

  useEffect(() => {
    fetch("/api/calendar/events")
      .then(res => res.json())
      .then(data => setEvents(data));
  }, [currentMonth]);

  const days = getCalendarDays(currentMonth);

  return (
    <div className="p-8 h-calc(100vh-20px) flex flex-col max-w-[1600px] mx-auto w-full">
      <CalendarHeader 
        currentMonth={currentMonth}
        onPrevMonth={() => setCurrentMonth(subMonths(currentMonth, 1))}
        onNextMonth={() => setCurrentMonth(addMonths(currentMonth, 1))}
        onToday={() => setCurrentMonth(new Date())}
      />

      <CalendarGrid 
        days={days}
        currentMonth={currentMonth}
        events={events}
        onDayClick={(day) => console.log("Día seleccionado:", day)}
      />
    </div>
  );
}