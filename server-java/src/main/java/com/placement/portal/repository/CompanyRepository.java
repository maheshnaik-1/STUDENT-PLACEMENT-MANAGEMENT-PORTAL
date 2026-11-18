package com.placement.portal.repository;

import com.placement.portal.entity.Company;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CompanyRepository extends JpaRepository<Company, Long> {
    Optional<Company> findByName(String name);
    Optional<Company> findByNameIgnoreCase(String name);
    boolean existsByName(String name);
    boolean existsByNameIgnoreCase(String name);
    List<Company> findAllByOrderByNameAsc();

    @Query("SELECT c FROM Company c WHERE " +
           "(:industry IS NULL OR LOWER(c.industry) = LOWER(:industry)) AND " +
           "(:search IS NULL OR LOWER(c.name) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "OR LOWER(c.location) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "OR LOWER(c.industry) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "ORDER BY c.name ASC")
    List<Company> searchCompanies(@Param("search") String search, @Param("industry") String industry);
}
