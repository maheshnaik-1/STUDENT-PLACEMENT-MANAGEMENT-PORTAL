package com.placement.portal.dto.auth;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.ArrayList;
import java.util.List;

public class ProjectDTO {
    private Long id;

    @JsonProperty("_id")
    private String _id;

    private String title;
    private String description;
    private List<String> techStack = new ArrayList<>();
    private String link;

    public ProjectDTO() {}

    public Long getId() { return id; }
    public void setId(Long id) {
        this.id = id;
        if (id != null) {
            this._id = String.valueOf(id);
        }
    }

    public String get_id() { return _id; }
    public void set_id(String _id) { this._id = _id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public List<String> getTechStack() { return techStack; }
    public void setTechStack(List<String> techStack) { this.techStack = techStack; }

    public String getLink() { return link; }
    public void setLink(String link) { this.link = link; }
}
