package com.placement.portal.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "student_skills", uniqueConstraints = {
    @UniqueConstraint(name = "uk_student_skill", columnNames = {"student_id", "skill"})
})
public class StudentSkill {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "student_id", nullable = false)
    private User student;

    @Column(name = "skill", nullable = false, length = 100)
    private String skill;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public StudentSkill() {}

    public StudentSkill(User student, String skill) {
        this.student = student;
        this.skill = skill;
    }

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public User getStudent() { return student; }
    public void setStudent(User student) { this.student = student; }

    public String getSkill() { return skill; }
    public void setSkill(String skill) { this.skill = skill; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
