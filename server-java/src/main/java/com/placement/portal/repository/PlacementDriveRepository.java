package com.placement.portal.repository;

import com.placement.portal.entity.PlacementDrive;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface PlacementDriveRepository extends JpaRepository<PlacementDrive, Long> {
    List<PlacementDrive> findByCompanyId(Long companyId);
    List<PlacementDrive> findByCompanyIdOrderByDriveDateDesc(Long companyId);
    List<PlacementDrive> findByStatus(String status);
    List<PlacementDrive> findByStatusNotOrderByDriveDateAscCreatedAtDesc(String status);
    List<PlacementDrive> findAllByOrderByDriveDateAscCreatedAtDesc();

    long countByCompanyId(Long companyId);
    long countByCompanyIdAndStatusIn(Long companyId, Collection<String> statuses);
    long countByStatusIn(Collection<String> statuses);

    void deleteByCompanyId(Long companyId);

    @Query("SELECT DISTINCT d FROM PlacementDrive d " +
           "LEFT JOIN FETCH d.company c " +
           "LEFT JOIN d.allowedBranches b " +
           "WHERE (:status IS NULL OR d.status = :status) " +
           "AND (:branch IS NULL OR b.branch = :branch) " +
           "AND (:search IS NULL OR LOWER(d.title) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "     OR LOWER(d.jobRole) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "     OR LOWER(c.name) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "     OR LOWER(d.location) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "ORDER BY d.driveDate ASC, d.createdAt DESC")
    List<PlacementDrive> searchDrives(@Param("search") String search,
                                     @Param("status") String status,
                                     @Param("branch") String branch);
}
