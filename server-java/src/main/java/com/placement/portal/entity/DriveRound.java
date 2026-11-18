package com.placement.portal.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "drive_rounds")
public class DriveRound {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "drive_id", nullable = false)
    private PlacementDrive drive;

    @Column(name = "round_order", nullable = false)
    private Integer roundOrder;

    @Column(name = "round_name", nullable = false, length = 100)
    private String roundName;

    public DriveRound() {}

    public DriveRound(PlacementDrive drive, Integer roundOrder, String roundName) {
        this.drive = drive;
        this.roundOrder = roundOrder;
        this.roundName = roundName;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public PlacementDrive getDrive() { return drive; }
    public void setDrive(PlacementDrive drive) { this.drive = drive; }

    public Integer getRoundOrder() { return roundOrder; }
    public void setRoundOrder(Integer roundOrder) { this.roundOrder = roundOrder; }

    public String getRoundName() { return roundName; }
    public void setRoundName(String roundName) { this.roundName = roundName; }
}
