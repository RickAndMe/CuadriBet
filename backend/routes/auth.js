const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../database');
const { generateToken, authenticateToken } = require('../auth');
const Joi = require('joi');

const router = express.Router();

// Input validation schemas
const registerSchema = Joi.object({
    username: Joi.string().min(3).max(30).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required()
});

const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
});

// Register user
router.post('/register', async (req, res) => {
    try {
        const { error, value } = registerSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        const { username, email, password } = value;

        // Check if user already exists
        db.get('SELECT id FROM users WHERE email = ? OR username = ?', [email, username], async (err, user) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }

            if (user) {
                return res.status(409).json({ error: 'User already exists with this email or username' });
            }

            // Hash password
            const passwordHash = await bcrypt.hash(password, 10);

            // Insert new user
            db.run('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
                [username, email, passwordHash],
                function(err) {
                    if (err) {
                        return res.status(500).json({ error: 'Failed to create user' });
                    }

                    const token = generateToken(this.lastID);
                    res.status(201).json({
                        message: 'User registered successfully',
                        token,
                        user: {
                            id: this.lastID,
                            username,
                            email
                        }
                    });
                }
            );
        });

    } catch (error) {
        console.error('Error in registration:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Login user
router.post('/login', (req, res) => {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ error: error.details[0].message });
    }

    const { email, password } = value;

    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }

        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const token = generateToken(user.id);
        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });
    });
});

// Get current user profile
router.get('/profile', authenticateToken, (req, res) => {
    db.get('SELECT id, username, email, created_at FROM users WHERE id = ?', [req.userId], (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ user });
    });
});

// Update user profile
router.put('/profile', authenticateToken, (req, res) => {
    const { username, email } = req.body;

    if (!username && !email) {
        return res.status(400).json({ error: 'At least one field (username or email) must be provided' });
    }

    // Check if email or username already taken by another user
    const checkQuery = username && email ?
        'SELECT id FROM users WHERE (email = ? OR username = ?) AND id != ?' :
        email ?
        'SELECT id FROM users WHERE email = ? AND id != ?' :
        'SELECT id FROM users WHERE username = ? AND id != ?';

    const checkParams = username && email ?
        [email, username, req.userId] :
        email ?
        [email, req.userId] :
        [username, req.userId];

    db.get(checkQuery, checkParams, (err, existing) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }

        if (existing) {
            return res.status(409).json({ error: 'Email or username already taken' });
        }

        // Update user
        const updateFields = [];
        const updateValues = [];

        if (username) {
            updateFields.push('username = ?');
            updateValues.push(username);
        }
        if (email) {
            updateFields.push('email = ?');
            updateValues.push(email);
        }

        const updateQuery = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
        updateValues.push(req.userId);

        db.run(updateQuery, updateValues, function(err) {
            if (err) {
                return res.status(500).json({ error: 'Failed to update profile' });
            }

            res.json({ message: 'Profile updated successfully' });
        });
    });
});

module.exports = router;
