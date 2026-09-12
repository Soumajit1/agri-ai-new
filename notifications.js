const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/:userId', (req, res) => {
    const userId = Number(req.params.userId);
    if (!Number.isInteger(userId) || userId <= 0) return res.status(400).json({ message: 'Invalid user ID' });

    const sql = `SELECT id, user_id, title, message, type, is_read, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`;
    db.query(sql, [userId], (err, notifications) => {
        if (err) {
            console.error('Notification fetch error:', err);
            return res.status(500).json({ message: 'Failed to fetch notifications' });
        }
        const unreadSql = `SELECT COUNT(*) AS unreadCount FROM notifications WHERE user_id = ? AND is_read = FALSE`;
        db.query(unreadSql, [userId], (countErr, countResult) => {
            if (countErr) return res.status(500).json({ message: 'Failed to fetch unread count' });
            res.json({ notifications, unreadCount: Number(countResult[0]?.unreadCount || 0) });
        });
    });
});

router.post('/', (req, res) => {
    const { userId, title, message, type = 'info' } = req.body;
    const numericUserId = Number(userId);
    if (!Number.isInteger(numericUserId) || numericUserId <= 0 || !String(title || '').trim() || !String(message || '').trim()) {
        return res.status(400).json({ message: 'Valid userId, title and message are required' });
    }
    const allowedTypes = ['info', 'offer', 'counter', 'transaction', 'shipment', 'success', 'warning', 'error'];
    const notificationType = allowedTypes.includes(type) ? type : 'info';
    const sql = `INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)`;
    db.query(sql, [numericUserId, String(title).trim(), String(message).trim(), notificationType], (err, result) => {
        if (err) {
            console.error('Notification creation error:', err);
            return res.status(500).json({ message: 'Failed to create notification' });
        }
        res.status(201).json({ message: 'Notification created successfully', notificationId: result.insertId });
    });
});

router.put('/:id/read', (req, res) => {
    const notificationId = Number(req.params.id);
    if (!Number.isInteger(notificationId) || notificationId <= 0) return res.status(400).json({ message: 'Invalid notification ID' });
    db.query(`UPDATE notifications SET is_read = TRUE WHERE id = ?`, [notificationId], (err, result) => {
        if (err) return res.status(500).json({ message: 'Failed to mark notification as read' });
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Notification not found' });
        res.json({ message: 'Notification marked as read' });
    });
});

router.put('/user/:userId/read-all', (req, res) => {
    const userId = Number(req.params.userId);
    if (!Number.isInteger(userId) || userId <= 0) return res.status(400).json({ message: 'Invalid user ID' });
    db.query(`UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE`, [userId], (err) => {
        if (err) return res.status(500).json({ message: 'Failed to mark notifications as read' });
        res.json({ message: 'All notifications marked as read' });
    });
});

module.exports = router;
