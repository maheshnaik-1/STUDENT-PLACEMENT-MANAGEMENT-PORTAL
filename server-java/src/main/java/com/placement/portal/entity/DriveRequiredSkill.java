package com.placement.portal.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "drive_required_skills", uniqueConstraints = {
    @UniqueConstraint(name = "uk_drive_skill", columnNames = {"drive_id", "skill"})
})
public class DriveRequiredSkill {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "drive_id", nullable = false)
    private PlacementDrive drive;

    @Column(name = "skill", nullable = false, length = 100)
    private String skill;

    public DriveRequiredSkill() {}

    public DriveRequiredSkill(PlacementDrive drive, String skill) {
        this.drive = drive;
        this.skill = skill;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public PlacementDrive getDrive() { return drive; }
    public void setDrive(PlacementDrive drive) { this.drive = drive; }

    public String getSkill() { return skill; }
    public void setSkill(String skill) { this.skill = skill; }
}
