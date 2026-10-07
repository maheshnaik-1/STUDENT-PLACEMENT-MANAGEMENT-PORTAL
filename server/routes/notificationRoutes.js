const express = require('express');
const router = express.Router();
const {
  getUserNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

// All notification routes require authentication
router.use(protect);

router.get('/', getUserNotifications);
router.get('/unread-count', getUnreadCount);

// Support both PUT and PATCH for marking read
router.put('/read-all', markAllNotificationsAsRead);
router.patch('/read-all', markAllNotificationsAsRead);

router.put('/:id/read', markNotificationAsRead);
router.patch('/:id/read', markNotificationAsRead);

module.exports = router;
