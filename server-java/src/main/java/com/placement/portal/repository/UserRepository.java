package com.placement.portal.repository;

import com.placement.portal.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    Optional<User> findByRollNo(String rollNo);
    boolean existsByEmail(String email);
    List<User> findByRole(String role);
    long countByRole(String role);
    Optional<User> findByIdAndRole(Long id, String role);

    @Query("SELECT u FROM User u WHERE u.role = 'student' " +
           "AND (:branch IS NULL OR u.branch = :branch) " +
           "AND (:minCgpa IS NULL OR u.cgpa >= :minCgpa) " +
           "AND (:search IS NULL OR LOWER(u.name) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "     OR LOWER(u.rollNo) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "     OR LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "ORDER BY u.rollNo ASC, u.name ASC")
    List<User> findStudentsFiltered(
            @Param("branch") String branch,
            @Param("minCgpa") BigDecimal minCgpa,
            @Param("search") String search);
}
