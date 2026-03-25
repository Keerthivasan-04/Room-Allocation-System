package com.nestmanager.repository;

import com.nestmanager.model.Booking;
import com.nestmanager.model.Booking.BookingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * BookingRepository
 *
 * Used by:
 *  - BookingService        → CRUD, double-booking check, status transitions
 *  - DashboardService      → pending bookings count for nav badge
 *  - ReportService         → total bookings count for KPI card
 *  - CheckoutReminderScheduler → upcoming checkouts
 */
@Repository
public interface BookingRepository extends JpaRepository<Booking, Long> {

    // Find booking by auto-generated booking code (e.g. "BK-001")
    Optional<Booking> findByBookingCode(String bookingCode);

    // Get all bookings by status
    // Used by bookings page filter tabs
    List<Booking> findByStatus(BookingStatus status);

    // Get all bookings for a specific room
    // Used to check booking history for a room
    List<Booking> findByRoomRoomNumber(String roomNumber);

    // Count bookings by status — used by dashboard nav badge
    long countByStatus(BookingStatus status);

    // Double booking check — used by BookingService before creating a booking
    // Checks if the room already has an ACTIVE booking on the same check-in date
    @Query("SELECT COUNT(b) > 0 FROM Booking b WHERE " +
           "b.room.roomNumber = :roomNumber AND " +
           "b.status NOT IN ('CANCELLED', 'CHECKED_OUT') AND " +
           "b.checkInDate = :checkInDate AND " +
           "(:excludeId IS NULL OR b.id != :excludeId)")
    boolean existsConflictingBooking(
            @Param("roomNumber") String roomNumber,
            @Param("checkInDate") LocalDate checkInDate,
            @Param("excludeId") Long excludeId);

    // Get bookings by month — used by bookings page month filter
    // forMonth format: "2025-03" — matches checkInDate year and month
    @Query("SELECT b FROM Booking b WHERE " +
           "YEAR(b.checkInDate) = :year AND MONTH(b.checkInDate) = :month")
    List<Booking> findByCheckInMonth(
            @Param("year") int year,
            @Param("month") int month);

    // Get the last booking to generate the next booking code
    // e.g. last code = "BK-009" → next = "BK-010"
    @Query("SELECT b FROM Booking b ORDER BY b.id DESC LIMIT 1")
    Optional<Booking> findLatestBooking();

    // Get bookings with upcoming check-out dates
    // Used by CheckoutReminderScheduler
    @Query("SELECT b FROM Booking b WHERE " +
           "b.status = 'CHECKED_IN' AND " +
           "b.checkOutDate BETWEEN :today AND :futureDate")
    List<Booking> findBookingsWithUpcomingCheckout(
            @Param("today") LocalDate today,
            @Param("futureDate") LocalDate futureDate);

    // Total bookings count for a year — used by reports page KPI
    @Query("SELECT COUNT(b) FROM Booking b WHERE YEAR(b.checkInDate) = :year")
    long countByYear(@Param("year") int year);
}
