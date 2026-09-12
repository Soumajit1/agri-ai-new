const express = require('express');
const db = require('../db');
const router = express.Router();
const VALID_STATUSES = ['available', 'sold', 'pending'];

function farmerId(value) { const id = Number(value); return Number.isInteger(id) && id > 0 ? id : null; }
function validate(data) {
    const { cropName, quantity, unit, pricePerUnit, quality, status } = data;
    if (!cropName || !String(cropName).trim()) return 'Crop name is required';
    const q = Number(quantity); if (!Number.isFinite(q) || q <= 0) return 'Quantity must be greater than 0';
    if (String(cropName).length > 100) return 'Crop name cannot exceed 100 characters';
    if (unit && String(unit).length > 20) return 'Unit cannot exceed 20 characters';
    if (pricePerUnit !== undefined && pricePerUnit !== null && pricePerUnit !== '') { const p = Number(pricePerUnit); if (!Number.isFinite(p) || p < 0) return 'Price per unit must be a valid positive number'; }
    if (quality && String(quality).length > 50) return 'Quality cannot exceed 50 characters';
    if (status && !VALID_STATUSES.includes(status)) return 'Invalid produce status';
    return null;
}

router.get('/:farmerId', (req, res) => {
    const id = farmerId(req.params.farmerId);
    if (!id) return res.status(400).json({ message: 'Invalid farmer ID' });
    db.query(`SELECT id, farmer_id, crop_name, quantity, unit, price_per_unit, quality, description, status, created_at FROM produce_listings WHERE farmer_id = ? ORDER BY created_at DESC`, [id], (err, results) => {
        if (err) { console.error('Fetch farmer produce error:', err); return res.status(500).json({ message: 'Failed to fetch produce listings' }); }
        res.json({ produce: results });
    });
});

router.post('/', (req, res) => {
    const { farmerId: rawId, cropName, quantity, unit = 'kg', pricePerUnit, quality, description, status = 'available' } = req.body;
    const id = farmerId(rawId);
    if (!id) return res.status(400).json({ message: 'Invalid farmer ID' });
    const validationError = validate(req.body); if (validationError) return res.status(400).json({ message: validationError });
    db.query(`SELECT id FROM users WHERE id = ? AND role = 'farmer' LIMIT 1`, [id], (e, rows) => {
        if (e) return res.status(500).json({ message: 'Failed to verify farmer' });
        if (!rows.length) return res.status(403).json({ message: 'User is not a valid farmer' });
        db.query(`INSERT INTO produce_listings (farmer_id, crop_name, quantity, unit, price_per_unit, quality, description, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [id, String(cropName).trim(), Number(quantity), unit || 'kg', pricePerUnit === '' || pricePerUnit === undefined ? null : Number(pricePerUnit), quality ? String(quality).trim() : null, description ? String(description).trim() : null, status], (err, result) => {
            if (err) { console.error('Add produce error:', err); return res.status(500).json({ message: 'Failed to add produce' }); }
            res.status(201).json({ message: 'Produce added successfully', produceId: result.insertId });
        });
    });
});

router.put('/:id', (req, res) => {
    const produceId = Number(req.params.id); const id = farmerId(req.body.farmerId);
    const { cropName, quantity, unit = 'kg', pricePerUnit, quality, description, status } = req.body;
    if (!Number.isInteger(produceId) || produceId <= 0) return res.status(400).json({ message: 'Invalid produce ID' });
    if (!id) return res.status(400).json({ message: 'Invalid farmer ID' });
    const validationError = validate(req.body); if (validationError) return res.status(400).json({ message: validationError });
    db.query(`SELECT id, status FROM produce_listings WHERE id = ? AND farmer_id = ? LIMIT 1`, [produceId, id], (e, rows) => {
        if (e) return res.status(500).json({ message: 'Failed to verify produce' });
        if (!rows.length) return res.status(404).json({ message: 'Produce listing not found' });
        if (rows[0].status === 'sold') return res.status(409).json({ message: 'Sold produce cannot be edited' });
        db.query(`UPDATE produce_listings SET crop_name = ?, quantity = ?, unit = ?, price_per_unit = ?, quality = ?, description = ?, status = ? WHERE id = ? AND farmer_id = ?`, [String(cropName).trim(), Number(quantity), unit || 'kg', pricePerUnit === '' || pricePerUnit === undefined ? null : Number(pricePerUnit), quality ? String(quality).trim() : null, description ? String(description).trim() : null, status || 'available', produceId, id], err => {
            if (err) return res.status(500).json({ message: 'Failed to update produce' });
            res.json({ message: 'Produce updated successfully' });
        });
    });
});

router.delete('/:id', (req, res) => {
    const produceId = Number(req.params.id); const id = farmerId(req.body.farmerId);
    if (!Number.isInteger(produceId) || produceId <= 0) return res.status(400).json({ message: 'Invalid produce ID' });
    if (!id) return res.status(400).json({ message: 'Invalid farmer ID' });
    db.query(`SELECT id, status FROM produce_listings WHERE id = ? AND farmer_id = ? LIMIT 1`, [produceId, id], (e, rows) => {
        if (e) return res.status(500).json({ message: 'Failed to verify produce' });
        if (!rows.length) return res.status(404).json({ message: 'Produce listing not found' });
        if (rows[0].status === 'sold') return res.status(409).json({ message: 'Sold produce cannot be deleted' });
        db.query(`DELETE FROM produce_listings WHERE id = ? AND farmer_id = ?`, [produceId, id], (err, result) => {
            if (err) return res.status(500).json({ message: 'Failed to delete produce' });
            if (!result.affectedRows) return res.status(404).json({ message: 'Produce listing not found' });
            res.json({ message: 'Produce deleted successfully' });
        });
    });
});

module.exports = router;
