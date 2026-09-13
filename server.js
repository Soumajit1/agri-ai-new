require("dotenv").config();
const express = require("express");
const cors = require("cors");

const db = require("./db");

// Routes
const authRoutes = require("./routes/auth");
const farmerRoutes = require("./routes/farmer");
const farmerProduceRoutes = require("./routes/farmer-produce");
const notificationRoutes = require("./routes/notifications");

const app = express();

// --------------------------------------------------
// Middleware
// --------------------------------------------------

app.use(cors());

// Parse JSON request bodies
app.use(express.json());

// Parse form-urlencoded request bodies
app.use(express.urlencoded({ extended: true }));

// --------------------------------------------------
// API Routes
// --------------------------------------------------

app.use("/api/auth", authRoutes);

app.use("/api/farmer", farmerRoutes);

app.use(
    "/api/farmer/produce",
    farmerProduceRoutes
);

app.use(
    "/api/notifications",
    notificationRoutes
);

// --------------------------------------------------
// Serve Static Files (Frontend)
// --------------------------------------------------

const path = require("path");
app.use(express.static(__dirname));

// Also optionally fallback to index.html for SPA if they visit something else
// app.get("*", (req, res) => {
//     res.sendFile(path.join(__dirname, "index.html"));
// });

// --------------------------------------------------
// Database test and setup
// --------------------------------------------------

app.get("/api/test-db", (req, res) => {
    db.query(
        "SELECT 1 AS test",
        (err, results) => {

            if (err) {
                console.error(
                    "Database connection failed:",
                    err
                );

                return res.status(500).json({
                    error:
                        "Database connection failed"
                });
            }

            res.json({
                message:
                    "MySQL connected successfully",
                result: results
            });
        }
    );
});

app.get("/api/setup-db", (req, res) => {
    const fs = require('fs');
    const path = require('path');
    
    try {
        const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
        const queries = schema.split(';').filter(q => q.trim().length > 0);
        
        let completed = 0;
        let hasError = false;
        
        if (queries.length === 0) {
            return res.json({ message: "No queries to run" });
        }
        
        queries.forEach(query => {
            db.query(query, (err) => {
                if (hasError) return;
                
                if (err) {
                    hasError = true;
                    console.error("Query failed:", err);
                    return res.status(500).json({ error: "Failed to setup DB", details: err.message });
                }
                
                completed++;
                if (completed === queries.length) {
                    res.json({ message: "Database tables created successfully!" });
                }
            });
        });
    } catch (err) {
        console.error("Setup error:", err);
        res.status(500).json({ error: "Failed to read schema file" });
    }
});

app.get("/api/check-db", (req, res) => {
    db.query("SHOW TABLES", (err, tables) => {
        if (err) return res.status(500).json({ error: err.message });
        
        db.query("DESCRIBE users", (err2, columns) => {
            if (err2) return res.json({ tables, usersError: err2.message });
            res.json({ tables, usersColumns: columns });
        });
    });
});

app.get("/api/reset-db", (req, res) => {
    const drops = [
        "DROP TABLE IF EXISTS shipments",
        "DROP TABLE IF EXISTS transactions",
        "DROP TABLE IF EXISTS offers",
        "DROP TABLE IF EXISTS notifications",
        "DROP TABLE IF EXISTS produce_listings",
        "DROP TABLE IF EXISTS users"
    ];
    
    let completed = 0;
    let hasError = false;
    
    drops.forEach(q => {
        db.query(q, (err) => {
            if (hasError) return;
            if (err) {
                hasError = true;
                return res.status(500).json({ error: "Drop failed", details: err.message });
            }
            completed++;
            if (completed === drops.length) {
                res.json({ message: "All tables dropped. Now visit /api/setup-db to recreate." });
            }
        });
    });
});

// --------------------------------------------------
// Global error handler
// --------------------------------------------------

app.use((err, req, res, next) => {

    console.error(
        "Server error:",
        err
    );

    res.status(500).json({
        message: "Internal server error."
    });
});

// --------------------------------------------------
// Start server
// --------------------------------------------------

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {

    console.log(
        `AgriLink AI Backend running on port ${PORT}`
    );

});
