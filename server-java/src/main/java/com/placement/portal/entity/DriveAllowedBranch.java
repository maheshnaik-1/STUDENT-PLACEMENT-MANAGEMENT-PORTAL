package com.placement.portal.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "drive_allowed_branches", uniqueConstraints = {
    @UniqueConstraint(name = "uk_drive_branch", columnNames = {"drive_id", "branch"})
})
public class DriveAllowedBranch {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "drive_id", nullable = false)
    private PlacementDrive drive;

    @Column(name = "branch", nullable = false, length = 50)
    private String branch;

    public DriveAllowedBranch() {}

    public DriveAllowedBranch(PlacementDrive drive, String branch) {
        this.drive = drive;
        this.branch = branch;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public PlacementDrive getDrive() { return drive; }
    public void setDrive(PlacementDrive drive) { this.drive = drive; }

    public String getBranch() { return branch; }
    public void setBranch(String branch) { this.branch = branch; }
}
