package com.placement.portal.repository;

import com.placement.portal.entity.StudentCertification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface StudentCertificationRepository extends JpaRepository<StudentCertification, Long> {
    List<StudentCertification> findByStudentId(Long studentId);
}
