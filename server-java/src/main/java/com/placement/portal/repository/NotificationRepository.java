package com.placement.portal.repository;

import com.placement.portal.entity.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByRecipientIdOrderByCreatedAtDesc(Long recipientId);
    Page<Notification> findByRecipientId(Long recipientId, Pageable pageable);
    Page<Notification> findByRecipientIdAndIsRead(Long recipientId, Boolean isRead, Pageable pageable);
    Page<Notification> findByRecipientIdAndType(Long recipientId, String type, Pageable pageable);
    Page<Notification> findByRecipientIdAndIsReadAndType(Long recipientId, Boolean isRead, String type, Pageable pageable);

    Optional<Notification> findByIdAndRecipientId(Long id, Long recipientId);
    long countByRecipientIdAndIsReadFalse(Long recipientId);
    long countByRecipientId(Long recipientId);
    long countByRecipientIdAndIsRead(Long recipientId, Boolean isRead);
    long countByRecipientIdAndType(Long recipientId, String type);
    long countByRecipientIdAndIsReadAndType(Long recipientId, Boolean isRead, String type);

    @Modifying
    @Query("UPDATE Notification n SET n.isRead = true, n.readAt = :now WHERE n.recipient.id = :recipientId AND n.isRead = false")
    int markAllAsReadByRecipientId(@Param("recipientId") Long recipientId, @Param("now") Instant now);
}
