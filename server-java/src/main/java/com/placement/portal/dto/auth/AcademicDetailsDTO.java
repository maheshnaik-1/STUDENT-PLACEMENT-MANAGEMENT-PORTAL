package com.placement.portal.dto.auth;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.math.BigDecimal;

@JsonInclude(JsonInclude.Include.ALWAYS)
public class AcademicDetailsDTO {
    private BigDecimal tenthPercentage;
    private BigDecimal twelfthPercentage;
    private BigDecimal diplomaPercentage;
    private Integer currentSemester;
    private Integer gapYears;

    public AcademicDetailsDTO() {
        this.gapYears = 0;
    }

    public BigDecimal getTenthPercentage() { return tenthPercentage; }
    public void setTenthPercentage(BigDecimal tenthPercentage) { this.tenthPercentage = tenthPercentage; }

    public BigDecimal getTwelfthPercentage() { return twelfthPercentage; }
    public void setTwelfthPercentage(BigDecimal twelfthPercentage) { this.twelfthPercentage = twelfthPercentage; }

    public BigDecimal getDiplomaPercentage() { return diplomaPercentage; }
    public void setDiplomaPercentage(BigDecimal diplomaPercentage) { this.diplomaPercentage = diplomaPercentage; }

    public Integer getCurrentSemester() { return currentSemester; }
    public void setCurrentSemester(Integer currentSemester) { this.currentSemester = currentSemester; }

    public Integer getGapYears() { return gapYears; }
    public void setGapYears(Integer gapYears) { this.gapYears = gapYears; }
}
