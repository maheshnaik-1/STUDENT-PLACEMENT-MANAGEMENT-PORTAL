package com.placement.portal.dto.company;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.placement.portal.dto.drive.DriveResponseDTO;

import java.util.ArrayList;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class CompanyDetailsDTO extends CompanyResponseDTO {

    private List<DriveResponseDTO> drives = new ArrayList<>();

    public CompanyDetailsDTO() {}

    public List<DriveResponseDTO> getDrives() { return drives; }
    public void setDrives(List<DriveResponseDTO> drives) { this.drives = drives; }
}
