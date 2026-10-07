const Notification = require('../models/Notification');

/**
 * @desc    Helper function to safely create a notification in DB
 * @param   {Object} params
 */
const createNotification = async ({
  recipient,
  role = 'student',
  title,
  message,
  type = 'SYSTEM',
  relatedEntity = null,
  relatedEntityType = null,
  link = null,
  metadata = {},
}) => {
  try {
    if (!recipient || !title || !message) {
      console.warn('[Notification] Missing required fields for notification creation');
      return null;
    }

    const notification = await Notification.create({
      recipient,
      role,
      title,
      message,
      type,
      relatedEntity,
      relatedEntityType,
      link,
      metadata,
    });

    return notification;
  } catch (error) {
    console.error('[Notification Creation Error]:', error.message);
    return null;
  }
};

/**
 * @desc    Get logged-in user's notifications (supports pagination & read filtering)
 * @route   GET /api/notifications
 * @access  Private (Student / Officer)
 */
const getUserNotifications = async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const skip = (page - 1) * limit;

    const query = { recipient: req.user._id };

    if (req.query.isRead !== undefined) {
      query.isRead = req.query.isRead === 'true';
    }

    if (req.query.type && req.query.type !== 'ALL') {
      query.type = req.query.type;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments(query),
      Notification.countDocuments({ recipient: req.user._id, isRead: false }),
    ]);

    res.status(200).json({
      success: true,
      count: notifications.length,
      total,
      unreadCount,
      page,
      pages: Math.ceil(total / limit) || 1,
      data: notifications,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get unread notifications count for logged-in user
 * @route   GET /api/notifications/unread-count
 * @access  Private (Student / Officer)
 */
const getUnreadCount = async (req, res, next) => {
  try {
    const count = await Notification.countDocuments({
      recipient: req.user._id,
      isRead: false,
    });

    res.status(200).json({
      success: true,
      count,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark a single notification as read
 * @route   PUT /api/notifications/:id/read
 * @access  Private (Owner only)
 */
const markNotificationAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      recipient: req.user._id,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found or access denied',
      });
    }

    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      await notification.save();
    }

    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      data: notification,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark all unread notifications as read for the logged-in user
 * @route   PUT /api/notifications/read-all
 * @access  Private (Student / Officer)
 */
const markAllNotificationsAsRead = async (req, res, next) => {
  try {
    const result = await Notification.updateMany(
      {
        recipient: req.user._id,
        isRead: false,
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      }
    );

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
      modifiedCount: result.modifiedCount || 0,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createNotification,
  getUserNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
};
