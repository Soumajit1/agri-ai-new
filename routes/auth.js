const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const db = require("../db");

const router = express.Router();

router.post("/login", async (req, res) => {
    try {
        console.log("LOGIN REQUEST BODY:", {
            email: req.body?.email,
            identifier: req.body?.identifier,
            role: req.body?.role,
            password: req.body?.password ? "provided" : "missing"
        });

        const email = req.body?.email || req.body?.identifier;
        const password = req.body?.password;
        const role = req.body?.role;

        if (!email || !password || !role) {
            return res.status(400).json({
                message: "Email, password and role are required."
            });
        }

        const allowedRoles = ["farmer", "buyer", "fpo", "admin"];

        if (!allowedRoles.includes(role)) {
            return res.status(400).json({
                message: "Invalid user role."
            });
        }

        const sql = `
            SELECT id, name, email, password, role
            FROM users
            WHERE email = ?
            LIMIT 1
        `;

        db.query(sql, [email], async (err, results) => {
            if (err) {
                console.error("Login database error:", err);
                return res.status(500).json({
                    message: "Database error during login."
                });
            }

            if (!results || results.length === 0) {
                return res.status(401).json({
                    message: "Invalid email or password."
                });
            }

            const user = results[0];

            if (user.role !== role) {
                return res.status(403).json({
                    message: "This account does not have the selected role."
                });
            }

            try {
                const passwordMatch = await bcrypt.compare(
                    password,
                    user.password
                );

                if (!passwordMatch) {
                    return res.status(401).json({
                        message: "Invalid email or password."
                    });
                }
            } catch (passwordError) {
                console.error("Password comparison error:", passwordError);
                return res.status(500).json({
                    message: "Password verification failed."
                });
            }

            const JWT_SECRET =
                process.env.JWT_SECRET ||
                "agrilink-development-secret";

            const token = jwt.sign(
                {
                    id: user.id,
                    email: user.email,
                    role: user.role
                },
                JWT_SECRET,
                { expiresIn: "7d" }
            );

            return res.status(200).json({
                message: "Login successful.",
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                }
            });
        });
    } catch (error) {
        console.error("Login route error:", error);
        return res.status(500).json({
            message: "Internal server error during login."
        });
    }
});

// ==========================================
// REGISTER ROUTE
// ==========================================
router.post("/register", async (req, res) => {
    try {
        const { name, email, password, role, mobile, location } = req.body;

        if (!name || !email || !password || !role) {
            return res.status(400).json({
                message: "Name, email, password, and role are required."
            });
        }

        const allowedRoles = ["farmer", "buyer", "fpo", "admin"];
        if (!allowedRoles.includes(role)) {
            return res.status(400).json({
                message: "Invalid user role."
            });
        }

        // Check if user exists
        db.query("SELECT id FROM users WHERE email = ? LIMIT 1", [email], async (err, results) => {
            if (err) {
                console.error("Database error checking user:", err);
                return res.status(500).json({ message: "Database error." });
            }

            if (results && results.length > 0) {
                return res.status(400).json({ message: "Email is already registered." });
            }

            try {
                // Hash the password
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(password, salt);

                // Insert into database
                const insertSql = `
                    INSERT INTO users (name, email, password, role, mobile, location)
                    VALUES (?, ?, ?, ?, ?, ?)
                `;

                db.query(insertSql, [name, email, hashedPassword, role, mobile || null, location || null], (insertErr, result) => {
                    if (insertErr) {
                        console.error("Error inserting user:", insertErr);
                        return res.status(500).json({ message: "Failed to create user." });
                    }

                    return res.status(201).json({
                        message: "Registration successful",
                        userId: result.insertId
                    });
                });
            } catch (hashError) {
                console.error("Password hash error:", hashError);
                return res.status(500).json({ message: "Error hashing password." });
            }
        });
    } catch (error) {
        console.error("Register route error:", error);
        return res.status(500).json({ message: "Internal server error during registration." });
    }
});

module.exports = router;
