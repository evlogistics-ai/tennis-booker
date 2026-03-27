import { useState, useEffect } from "react";
import { format, addDays, isBefore, startOfDay } from "date-fns";
import { TIME_SLOTS } from "../data/courts";

export default function TimeSlotPicker({ court, isSlotBooked, fetchSlots, onBook, onBack }) {
  const today = startOfDay(new Date());
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i));
  const [selectedDate, setSelectedDate] = useState(days[0]);

  const dateStr = format(selectedDate, "yyyy-MM-dd");

  // Fetch availability whenever court or date changes
  useEffect(() => {
    if (fetchSlots) fetchSlots(court.id, dateStr);
  }, [court.id, dateStr, fetchSlots]);

  const now = new Date();
  const isToday = format(selectedDate, "yyyy-MM-dd") === format(now, "yyyy-MM-dd");

  return (
    <div>
      <button className="back-btn" onClick={onBack}>
        &larr; Back to courts
      </button>

      <h2>{court.name}</h2>
      <p className="court-subtitle">
        {court.location} &middot; {court.surface}
      </p>

      <div className="date-picker">
        {days.map((day) => {
          const active = format(day, "yyyy-MM-dd") === dateStr;
          return (
            <button
              key={day.toISOString()}
              className={`date-btn ${active ? "date-btn-active" : ""}`}
              onClick={() => setSelectedDate(day)}
            >
              <span className="date-day">{format(day, "EEE")}</span>
              <span className="date-num">{format(day, "d")}</span>
            </button>
          );
        })}
      </div>

      <div className="slot-grid">
        {TIME_SLOTS.map((slot) => {
          const booked = isSlotBooked(court.id, dateStr, slot.start);
          const hour = parseInt(slot.start.split(":")[0], 10);
          const pastSlot = isToday && hour <= now.getHours();

          const disabled = booked || pastSlot;

          return (
            <button
              key={slot.start}
              className={`slot-btn ${booked ? "slot-booked" : ""} ${pastSlot ? "slot-past" : ""}`}
              disabled={disabled}
              onClick={() => onBook(court.id, dateStr, slot.start, slot.end, court.name)}
            >
              {slot.label}
              {booked && <span className="slot-tag">Booked</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
