import { format, parse, isBefore, startOfDay } from "date-fns";

function formatTime(t) {
  const d = parse(t, "HH:mm", new Date());
  return format(d, "h:mm a");
}

export default function MyBookings({ bookings, courts = [], onCancel, onBack }) {
  const today = startOfDay(new Date());

  const upcoming = bookings
    .filter((b) => !isBefore(new Date(b.date + "T00:00:00"), today))
    .sort((a, b) => {
      const cmp = a.date.localeCompare(b.date);
      return cmp !== 0 ? cmp : a.startTime.localeCompare(b.startTime);
    });

  const courtMap = Object.fromEntries(courts.map((c) => [c.id, c]));

  return (
    <div>
      <button className="back-btn" onClick={onBack}>
        &larr; Back to courts
      </button>
      <h2>My Bookings</h2>

      {upcoming.length === 0 ? (
        <p className="empty-state">No upcoming bookings. Go book a court!</p>
      ) : (
        <div className="bookings-list">
          {upcoming.map((b) => {
            const court = courtMap[b.courtId];
            return (
              <div key={b.id} className="booking-item">
                <div className="booking-info">
                  <h3>{court?.name || `Court ${b.courtId}`}</h3>
                  <p>
                    {format(new Date(b.date + "T00:00:00"), "EEE, MMM d")} &middot;{" "}
                    {formatTime(b.startTime)} &ndash; {formatTime(b.endTime)}
                  </p>
                  {court && (
                    <p className="booking-meta">
                      {court.location} &middot; {court.surface}
                    </p>
                  )}
                </div>
                <button
                  className="btn btn-danger"
                  onClick={() => onCancel(b.id)}
                >
                  Cancel
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
