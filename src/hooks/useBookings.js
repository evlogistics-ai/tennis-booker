import { useState, useCallback, useEffect } from "react";
import { useAuth } from "./useAuth";

export function useBookings() {
  const { authFetch } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [slotCache, setSlotCache] = useState({}); // key: "courtId:date" → [booking]

  // Fetch current user's bookings
  const fetchMyBookings = useCallback(async () => {
    const res = await authFetch("/api/my-bookings");
    if (res.ok) {
      const data = await res.json();
      setBookings(data);
    }
  }, [authFetch]);

  useEffect(() => {
    fetchMyBookings();
  }, [fetchMyBookings]);

  // Fetch bookings for a specific court + date (for availability)
  const fetchSlots = useCallback(
    async (courtId, date) => {
      const key = `${courtId}:${date}`;
      const res = await fetch(`/api/bookings?courtId=${courtId}&date=${date}`);
      if (res.ok) {
        const data = await res.json();
        setSlotCache((prev) => ({ ...prev, [key]: data }));
      }
    },
    []
  );

  const isSlotBooked = useCallback(
    (courtId, date, startTime) => {
      const key = `${courtId}:${date}`;
      const slots = slotCache[key];
      if (!slots) return false;
      return slots.some((b) => b.startTime === startTime);
    },
    [slotCache]
  );

  const addBooking = useCallback(
    async (courtId, date, startTime, endTime) => {
      const res = await authFetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courtId, date, startTime, endTime }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Booking failed");
      }
      await fetchMyBookings();
      await fetchSlots(courtId, date);
    },
    [authFetch, fetchMyBookings, fetchSlots]
  );

  const cancelBooking = useCallback(
    async (bookingId) => {
      const booking = bookings.find((b) => b.id === bookingId);
      const res = await authFetch(`/api/bookings/${bookingId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Cancel failed");
      }
      await fetchMyBookings();
      if (booking) {
        await fetchSlots(booking.courtId, booking.date);
      }
    },
    [authFetch, bookings, fetchMyBookings, fetchSlots]
  );

  return { bookings, addBooking, cancelBooking, isSlotBooked, fetchSlots };
}
