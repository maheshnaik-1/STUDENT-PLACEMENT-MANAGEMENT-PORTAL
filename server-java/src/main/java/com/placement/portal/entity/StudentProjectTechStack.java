package com.placement.portal.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "student_project_tech_stacks")
public class StudentProjectTechStack {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "project_id", nullable = false)
    private StudentProject project;

    @Column(name = "tech", nullable = false, length = 100)
    private String tech;

    public StudentProjectTechStack() {}

    public StudentProjectTechStack(StudentProject project, String tech) {
        this.project = project;
        this.tech = tech;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public StudentProject getProject() { return project; }
    public void setProject(StudentProject project) { this.project = project; }

    public String getTech() { return tech; }
    public void setTech(String tech) { this.tech = tech; }
}
