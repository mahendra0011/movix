const memoryBookings = [];

function addMemoryBooking(booking) {
  memoryBookings.push(booking);
  return booking;
}

function getMemoryBookings() {
  return memoryBookings;
}

function getMemoryBookingByRef(ref) {
  return memoryBookings.find((booking) => booking.ref === ref);
}

function getMemoryBookedSeats(showId) {
  return memoryBookings
    .filter((booking) => booking.showId === showId && booking.status === "confirmed")
    .flatMap((booking) => booking.seats);
}

export { addMemoryBooking, getMemoryBookedSeats, getMemoryBookingByRef, getMemoryBookings };
