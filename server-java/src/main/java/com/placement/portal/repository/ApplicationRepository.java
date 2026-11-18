package com.placement.portal.repository;

import com.placement.portal.entity.Application;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface ApplicationRepository extends JpaRepository<Application, Long> {
    Optional<Application> findByDriveIdAndStudentId(Long driveId, Long studentId);
    List<Application> findByStudentId(Long studentId);
    List<Application> findByStudentIdOrderByAppliedAtDesc(Long studentId);
    List<Application> findByDriveId(Long driveId);
    List<Application> findByDriveIdOrderByAppliedAtDesc(Long driveId);
    List<Application> findByDriveIdAndStatusOrderByAppliedAtDesc(Long driveId, String status);
    List<Application> findByIdInAndDriveId(Collection<Long> ids, Long driveId);
    List<Application> findAllByOrderByAppliedAtDesc();
    List<Application> findByStatus(String status);
    boolean existsByDriveIdAndStudentId(Long driveId, Long studentId);
    long countByStatus(String status);
    long countByStatusIn(Collection<String> statuses);
    long countByDriveId(Long driveId);

    @Modifying
    @Query("DELETE FROM Application a WHERE a.drive.id = :driveId")
    void deleteByDriveId(@Param("driveId") Long driveId);

    @Modifying
    @Query("DELETE FROM Application a WHERE a.drive.id IN :driveIds")
    void deleteByDriveIdIn(@Param("driveIds") Collection<Long> driveIds);
}
