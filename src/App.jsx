import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { useBookings } from "./hooks/useBookings";
import CourtList from "./components/CourtList";
import TimeSlotPicker from "./components/TimeSlotPicker";
import BookingConfirmation from "./components/BookingConfirmation";
import MyBookings from "./components/MyBookings";
import AuthForm from "./components/AuthForm";
import "./App.css";

function AppContent() {
  const { user, loading, logout } = useAuth();
  const { bookings, addBooking, cancelBooking, isSlotBooked, fetchSlots } = useBookings();
  const [view, setView] = useState("courts");
  const [selectedCourt, setSelectedCourt] = useState(null);
  const [pendingBooking, setPendingBooking] = useState(null);
  const [courts, setCourts] = useState([]);
  const [bookingError, setBookingError] = useState("");

  // Fetch courts from API
  useEffect(() => {
    fetch("/api/courts")
      .then((r) => r.json())
      .then(setCourts)
      .catch(() => {});
  }, []);

  if (loading) {
    return <div className="app"><p style={{ textAlign: "center", padding: 48 }}>Loading...</p></div>;
  }

  if (!user) {
    return <AuthForm />;
  }

  function handleSelectCourt(court) {
    setSelectedCourt(court);
    setView("slots");
  }

  function handleBookSlot(courtId, date, startTime, endTime, courtName) {
    setPendingBooking({ courtId, date, startTime, endTime, courtName });
    setBookingError("");
  }

  async function handleConfirm() {
    const { courtId, date, startTime, endTime } = pendingBooking;
    try {
      await addBooking(courtId, date, startTime, endTime);
      setPendingBooking(null);
      setBookingError("");
    } catch (err) {
      setBookingError(err.message);
    }
  }

  function handleCancelPending() {
    setPendingBooking(null);
    setBookingError("");
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1 onClick={() => setView("courts")} style={{ cursor: "pointer" }}>
          🎾 Tennis Booker
        </h1>
        <div className="header-right">
          <span className="user-email">{user.email}</span>
          <button
            className="btn btn-outline"
            onClick={() => setView(view === "myBookings" ? "courts" : "myBookings")}
          >
            {view === "myBookings" ? "Browse Courts" : `My Bookings (${bookings.length})`}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={logout}>
            Log out
          </button>
        </div>
      </header>

      <main className="app-main">
        {view === "courts" && (
          <CourtList courts={courts} onSelectCourt={handleSelectCourt} />
        )}

        {view === "slots" && selectedCourt && (
          <TimeSlotPicker
            court={selectedCourt}
            isSlotBooked={isSlotBooked}
            fetchSlots={fetchSlots}
            onBook={handleBookSlot}
            onBack={() => setView("courts")}
          />
        )}

        {view === "myBookings" && (
          <MyBookings
            bookings={bookings}
            courts={courts}
            onCancel={cancelBooking}
            onBack={() => setView("courts")}
          />
        )}
      </main>

      <BookingConfirmation
        pending={pendingBooking}
        error={bookingError}
        onConfirm={handleConfirm}
        onCancel={handleCancelPending}
      />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
