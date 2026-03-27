import { format, parse } from "date-fns";

function formatTime(t) {
  const d = parse(t, "HH:mm", new Date());
  return format(d, "h:mm a");
}

export default function BookingConfirmation({ pending, error, onConfirm, onCancel }) {
  if (!pending) return null;

  const displayDate = format(new Date(pending.date + "T00:00:00"), "EEEE, MMMM d");

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>Confirm Booking</h2>
        <div className="confirm-details">
          <p><strong>Court:</strong> {pending.courtName}</p>
          <p><strong>Date:</strong> {displayDate}</p>
          <p><strong>Time:</strong> {formatTime(pending.startTime)} &ndash; {formatTime(pending.endTime)}</p>
        </div>
        {error && <p className="auth-error">{error}</p>}
        <div className="modal-actions">
          <button className="btn btn-primary" onClick={onConfirm}>
            Confirm Booking
          </button>
          <button className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
