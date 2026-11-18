package com.placement.portal.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class RegisterRequest {

    @NotBlank(message = "Please provide your full name")
    private String name;

    @NotBlank(message = "Please provide your college email address")
    @Email(message = "Please provide a valid email address")
    private String email;

    @NotBlank(message = "Please provide a password")
    @Size(min = 6, message = "Password must be at least 6 characters")
    private String password;

    private String rollNo;
    private String branch;
    private Object cgpa;
    private Object activeBacklogs;
    private Object passingYear;
    private String phone;
    private Object skills;
    private String resumeUrl;

    public RegisterRequest() {}

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getRollNo() { return rollNo; }
    public void setRollNo(String rollNo) { this.rollNo = rollNo; }

    public String getBranch() { return branch; }
    public void setBranch(String branch) { this.branch = branch; }

    public Object getCgpa() { return cgpa; }
    public void setCgpa(Object cgpa) { this.cgpa = cgpa; }

    public Object getActiveBacklogs() { return activeBacklogs; }
    public void setActiveBacklogs(Object activeBacklogs) { this.activeBacklogs = activeBacklogs; }

    public Object getPassingYear() { return passingYear; }
    public void setPassingYear(Object passingYear) { this.passingYear = passingYear; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public Object getSkills() { return skills; }
    public void setSkills(Object skills) { this.skills = skills; }

    public String getResumeUrl() { return resumeUrl; }
    public void setResumeUrl(String resumeUrl) { this.resumeUrl = resumeUrl; }
}
