package com.placement.portal.dto.auth;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.ALWAYS)
public class LinksDTO {
    private String github;
    private String linkedin;
    private String portfolio;

    public LinksDTO() {
        this.github = "";
        this.linkedin = "";
        this.portfolio = "";
    }

    public LinksDTO(String github, String linkedin, String portfolio) {
        this.github = github != null ? github : "";
        this.linkedin = linkedin != null ? linkedin : "";
        this.portfolio = portfolio != null ? portfolio : "";
    }

    public String getGithub() { return github; }
    public void setGithub(String github) { this.github = github; }

    public String getLinkedin() { return linkedin; }
    public void setLinkedin(String linkedin) { this.linkedin = linkedin; }

    public String getPortfolio() { return portfolio; }
    public void setPortfolio(String portfolio) { this.portfolio = portfolio; }
}
