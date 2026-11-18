package com.placement.portal.dto.drive;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.ArrayList;
import java.util.List;

public class AcademicEligibilityDTO {

    @JsonProperty("isEligible")
    private boolean isEligible;
    private List<String> reasons = new ArrayList<>();

    public AcademicEligibilityDTO() {}

    public AcademicEligibilityDTO(boolean isEligible, List<String> reasons) {
        this.isEligible = isEligible;
        this.reasons = reasons != null ? reasons : new ArrayList<>();
    }

    @JsonProperty("isEligible")
    public boolean isEligible() { return isEligible; }
    public void setEligible(boolean eligible) { isEligible = eligible; }

    public List<String> getReasons() { return reasons; }
    public void setReasons(List<String> reasons) { this.reasons = reasons; }
}
