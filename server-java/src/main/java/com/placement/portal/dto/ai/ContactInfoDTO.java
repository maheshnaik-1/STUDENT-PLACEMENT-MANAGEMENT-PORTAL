package com.placement.portal.dto.ai;

import java.util.ArrayList;
import java.util.List;

public class ContactInfoDTO {
    private String email;
    private String phone;
    private List<String> links = new ArrayList<>();

    public ContactInfoDTO() {}

    public ContactInfoDTO(String email, String phone, List<String> links) {
        this.email = email;
        this.phone = phone;
        this.links = links != null ? links : new ArrayList<>();
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public List<String> getLinks() {
        return links;
    }

    public void setLinks(List<String> links) {
        this.links = links != null ? links : new ArrayList<>();
    }
}

