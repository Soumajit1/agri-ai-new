const express = require('express');
const db = require('../db');
const router = express.Router();

function query(sql, params = []) {
    return new Promise((resolve, reject) => db.query(sql, params, (err, results) => err ? reject(err) : resolve(results)));
}

async function findFarmer(req) {
    const userId = Number(req.query.userId);
    const name = req.query.name;
    if (Number.isInteger(userId) && userId > 0) {
        const rows = await query(`SELECT id, name, email, role FROM users WHERE id = ? AND role = 'farmer' LIMIT 1`, [userId]);
        return rows.length ? rows[0] : null;
    }
    if (name) {
        const rows = await query(`SELECT id, name, email, role FROM users WHERE name = ? AND role = 'farmer' LIMIT 1`, [name]);
        return rows.length ? rows[0] : null;
    }
    return null;
}

async function getColumns(tableName) {
    const rows = await query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`, [tableName]);
    return rows.map(row => row.COLUMN_NAME);
}

function findUserColumn(columns) {
    return ['farmer_id', 'user_id', 'seller_id', 'owner_id', 'created_by'].find(c => columns.includes(c));
}

async function getTableRecords(tableName, farmerId) {
    const columns = await getColumns(tableName);
    if (!columns.length) return [];
    const ownerColumn = findUserColumn(columns);
    if (!ownerColumn) return [];
    return query(`SELECT * FROM ${tableName} WHERE ${ownerColumn} = ? ORDER BY id DESC`, [farmerId]);
}

function getNumericValue(row) {
    for (const c of ['amount', 'total_amount', 'total_price', 'price', 'transaction_amount', 'payment_amount']) {
        if (row[c] !== null && row[c] !== undefined && !Number.isNaN(Number(row[c]))) return Number(row[c]);
    }
    return 0;
}

function getStatus(row) {
    for (const c of ['status', 'offer_status', 'transaction_status', 'payment_status']) {
        if (row[c]) return String(row[c]).toLowerCase();
    }
    return '';
}

router.get('/overview', async (req, res) => {
    try {
        const farmer = await findFarmer(req);
        if (!farmer) return res.status(404).json({ message: 'Farmer not found' });
        const [produce, offers, transactions, shipments] = await Promise.all([
            getTableRecords('produce_listings', farmer.id),
            getTableRecords('offers', farmer.id),
            getTableRecords('transactions', farmer.id),
            getTableRecords('shipments', farmer.id)
        ]);
        const activeOffers = offers.filter(r => ['pending','negotiating','active',''].includes(getStatus(r)));
        const pendingTransactions = transactions.filter(r => ['pending','processing','initiated','unpaid'].includes(getStatus(r)));
        const totalEarnings = transactions.filter(r => ['completed','success','successful','paid',''].includes(getStatus(r))).reduce((t,r) => t + getNumericValue(r), 0);
        res.json({
            success: true,
            farmer: { id: farmer.id, name: farmer.name, email: farmer.email, role: farmer.role },
            statistics: {
                totalEarnings,
                activeOffers: activeOffers.length,
                pendingTransactions: pendingTransactions.length,
                totalProduce: produce.length,
                totalOffers: offers.length,
                totalTransactions: transactions.length,
                totalShipments: shipments.length
            },
            produce: produce.slice(0,5),
            offers: offers.slice(0,10),
            transactions: transactions.slice(0,5),
            shipments: shipments.slice(0,5)
        });
    } catch (error) {
        console.error('Farmer overview error:', error);
        res.status(500).json({ message: 'Failed to load farmer overview' });
    }
});

module.exports = router;
