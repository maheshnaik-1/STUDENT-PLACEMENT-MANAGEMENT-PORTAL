package com.placement.portal.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "application_withdrawals")
public class ApplicationWithdrawal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "original_application_id")
    private Long originalApplicationId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "drive_id", nullable = false)
    private PlacementDrive drive;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "student_id", nullable = false)
    private User student;

    @Column(name = "withdrawn_at", nullable = false, updatable = false)
    private Instant withdrawnAt;

    @Column(name = "previous_status", nullable = false, length = 50)
    private String previousStatus;

    @Column(name = "reason", length = 500)
    private String reason;

    public ApplicationWithdrawal() {}

    @PrePersist
    protected void onCreate() {
        if (withdrawnAt == null) withdrawnAt = Instant.now();
        if (previousStatus == null) previousStatus = "Applied";
        if (reason == null) reason = "Withdrawn by student";
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getOriginalApplicationId() { return originalApplicationId; }
    public void setOriginalApplicationId(Long originalApplicationId) { this.originalApplicationId = originalApplicationId; }

    public PlacementDrive getDrive() { return drive; }
    public void setDrive(PlacementDrive drive) { this.drive = drive; }

    public User getStudent() { return student; }
    public void setStudent(User student) { this.student = student; }

    public Instant getWithdrawnAt() { return withdrawnAt; }
    public void setWithdrawnAt(Instant withdrawnAt) { this.withdrawnAt = withdrawnAt; }

    public String getPreviousStatus() { return previousStatus; }
    public void setPreviousStatus(String previousStatus) { this.previousStatus = previousStatus; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
}
