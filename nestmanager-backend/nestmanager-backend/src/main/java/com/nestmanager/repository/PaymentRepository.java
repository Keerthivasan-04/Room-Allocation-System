package com.nestmanager.repository;

import com.nestmanager.model.Payment;
import com.nestmanager.model.Payment.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {

    Optional<Payment> findByReceiptNumber(String receiptNumber);

    // Use explicit JPQL — tenant is a @ManyToOne relationship, not a direct field
    @Query("SELECT p FROM Payment p WHERE p.tenant.id = :tenantId")
    List<Payment> findByTenantId(@Param("tenantId") Long tenantId);

    // Check duplicate payment for same tenant + month
    @Query("SELECT COUNT(p) > 0 FROM Payment p WHERE p.tenant.id = :tenantId AND p.forMonth = :forMonth")
    boolean existsByTenantIdAndForMonth(
            @Param("tenantId") Long tenantId,
            @Param("forMonth") String forMonth);

    List<Payment> findByStatus(PaymentStatus status);

    List<Payment> findByForMonth(String forMonth);

    List<Payment> findByStatusAndForMonth(PaymentStatus status, String forMonth);

    List<Payment> findByPaymentMethod(Payment.PaymentMethod paymentMethod);

    long countByStatus(PaymentStatus status);

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payment p WHERE " +
            "p.status = 'PAID' AND p.forMonth = :forMonth")
    BigDecimal sumPaidAmountForMonth(@Param("forMonth") String forMonth);

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payment p WHERE p.status = 'PENDING'")
    BigDecimal sumPendingAmount();

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payment p WHERE p.status = 'OVERDUE'")
    BigDecimal sumOverdueAmount();

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payment p WHERE p.status = 'PAID'")
    BigDecimal sumTotalRevenue();

    @Query("SELECT MONTH(p.paidDate), COALESCE(SUM(p.amount), 0) " +
            "FROM Payment p WHERE p.status = 'PAID' AND YEAR(p.paidDate) = :year " +
            "GROUP BY MONTH(p.paidDate) ORDER BY MONTH(p.paidDate)")
    List<Object[]> monthlyRevenueByYear(@Param("year") int year);

    @Query("SELECT MONTH(p.dueDate), p.status, COALESCE(SUM(p.amount), 0) " +
            "FROM Payment p WHERE YEAR(p.dueDate) = :year " +
            "GROUP BY MONTH(p.dueDate), p.status ORDER BY MONTH(p.dueDate)")
    List<Object[]> monthlyBreakdownByYear(@Param("year") int year);

    @Query("SELECT p FROM Payment p WHERE p.status IN ('PENDING') AND p.dueDate < :today")
    List<Payment> findOverduePayments(@Param("today") LocalDate today);

    @Query("SELECT p FROM Payment p ORDER BY p.id DESC LIMIT 1")
    Optional<Payment> findLatestPayment();

    @Query("SELECT p FROM Payment p WHERE p.status IN ('OVERDUE', 'PENDING') " +
            "ORDER BY p.status DESC, p.dueDate ASC")
    List<Payment> findPaymentAlerts();

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payment p WHERE " +
            "p.tenant.id = :tenantId AND p.status = 'PAID' AND YEAR(p.paidDate) = :year")
    BigDecimal sumPaidByTenantForYear(
            @Param("tenantId") Long tenantId,
            @Param("year") int year);
}