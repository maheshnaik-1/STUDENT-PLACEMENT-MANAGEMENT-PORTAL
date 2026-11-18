package com.placement.portal.dto.application;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.placement.portal.dto.drive.DriveResponseDTO;

import java.util.ArrayList;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class DriveApplicantsResponseDTO {

    private boolean success = true;
    private DriveResponseDTO drive;
    private int count;
    private List<ApplicationResponseDTO> data = new ArrayList<>();

    public DriveApplicantsResponseDTO() {}

    public DriveApplicantsResponseDTO(DriveResponseDTO drive, List<ApplicationResponseDTO> data) {
        this.success = true;
        this.drive = drive;
        this.data = data != null ? data : new ArrayList<>();
        this.count = this.data.size();
    }

    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }

    public DriveResponseDTO getDrive() { return drive; }
    public void setDrive(DriveResponseDTO drive) { this.drive = drive; }

    public int getCount() { return count; }
    public void setCount(int count) { this.count = count; }

    public List<ApplicationResponseDTO> getData() { return data; }
    public void setData(List<ApplicationResponseDTO> data) {
        this.data = data != null ? data : new ArrayList<>();
        this.count = this.data.size();
    }
}
