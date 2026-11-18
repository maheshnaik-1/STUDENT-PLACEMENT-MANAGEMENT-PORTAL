package com.placement.portal.repository;

import com.placement.portal.entity.ApplicationWithdrawal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface ApplicationWithdrawalRepository extends JpaRepository<ApplicationWithdrawal, Long> {
    List<ApplicationWithdrawal> findByStudentId(Long studentId);
    List<ApplicationWithdrawal> findByDriveId(Long driveId);
    Optional<ApplicationWithdrawal> findByOriginalApplicationId(Long originalApplicationId);
    boolean existsByDriveIdAndStudentId(Long driveId, Long studentId);

    @Modifying
    @Query("DELETE FROM ApplicationWithdrawal w WHERE w.drive.id = :driveId")
    void deleteByDriveId(@Param("driveId") Long driveId);

    @Modifying
    @Query("DELETE FROM ApplicationWithdrawal w WHERE w.drive.id IN :driveIds")
    void deleteByDriveIdIn(@Param("driveIds") Collection<Long> driveIds);
}
