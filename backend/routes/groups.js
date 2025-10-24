const express = require('express');
const db = require('../database');
const { authenticateToken } = require('../auth');
const Joi = require('joi');

const router = express.Router();

// Input validation schemas
const createGroupSchema = Joi.object({
    name: Joi.string().min(1).max(100).required()
});

const joinGroupSchema = Joi.object({
    code: Joi.string().min(6).max(10).required()
});

// Create a new group
router.post('/', authenticateToken, (req, res) => {
    const { error, value } = createGroupSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ error: error.details[0].message });
    }

    const { name } = value;
    const userId = req.userId;

    // Generate unique invite code (6 characters)
    const inviteCode = generateInviteCode();

    db.run('INSERT INTO groups (name, invite_code, created_by) VALUES (?, ?, ?)',
        [name, inviteCode, userId],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Failed to create group' });
            }

            const groupId = this.lastID;

            // Add creator as first member
            db.run('INSERT INTO group_members (group_id, user_id) VALUES (?, ?)',
                [groupId, userId],
                function(err) {
                    if (err) {
                        return res.status(500).json({ error: 'Failed to add group member' });
                    }

                    res.status(201).json({
                        message: 'Group created successfully',
                        group: {
                            id: groupId,
                            name,
                            inviteCode,
                            memberCount: 1
                        }
                    });
                }
            );
        }
    );
});

// Join group using invite code
router.post('/join', authenticateToken, (req, res) => {
    const { error, value } = joinGroupSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ error: error.details[0].message });
    }

    const { code } = value;
    const upperCode = code.toUpperCase();
    const userId = req.userId;

    // Find group by invite code
    db.get('SELECT id, name FROM groups WHERE invite_code = ?', [upperCode], (err, group) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }

        if (!group) {
            return res.status(404).json({ error: 'Invalid invite code' });
        }

        // Check if user is already a member
        db.get('SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?', [group.id, userId], (err, membership) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }

            if (membership) {
                return res.status(409).json({ error: 'Already a member of this group' });
            }

            // Add user to group
            db.run('INSERT INTO group_members (group_id, user_id) VALUES (?, ?)',
                [group.id, userId],
                function(err) {
                    if (err) {
                        return res.status(500).json({ error: 'Failed to join group' });
                    }

                    res.json({
                        message: 'Successfully joined group',
                        group: {
                            id: group.id,
                            name: group.name
                        }
                    });
                }
            );
        });
    });
});

// Get all groups for current user
router.get('/', authenticateToken, (req, res) => {
    const userId = req.userId;

    const query = `
        SELECT
            g.id, g.name, g.invite_code, g.created_at,
            COUNT(gm2.user_id) as member_count,
            g.created_by = ? as is_owner
        FROM groups g
        JOIN group_members gm ON g.id = gm.group_id
        LEFT JOIN group_members gm2 ON g.id = gm2.group_id
        WHERE gm.user_id = ?
        GROUP BY g.id, g.name, g.invite_code, g.created_at, g.created_by
        ORDER BY g.created_at DESC
    `;

    db.all(query, [userId, userId], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }

        res.json({ groups: rows });
    });
});

// Get specific group details
router.get('/:groupId', authenticateToken, (req, res) => {
    const groupId = req.params.groupId;
    const userId = req.userId;

    console.log(`GET /groups/${groupId} - User: ${userId}`);

    // Check if user is a member of the group
    db.get('SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?', [groupId, userId], (err, membership) => {
        if (err) {
            console.error('Error checking group membership:', err);
            return res.status(500).json({ error: 'Database error: ' + err.message });
        }

        if (!membership) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Get group details
        const groupQuery = `
            SELECT
                g.id, g.name, g.invite_code, g.created_at,
                COUNT(gm.user_id) as member_count,
                g.created_by = ? as is_owner
            FROM groups g
            LEFT JOIN group_members gm ON g.id = gm.group_id
            WHERE g.id = ?
            GROUP BY g.id
        `;

        db.get(groupQuery, [userId, groupId], (err, group) => {
            if (err || !group) {
                return res.status(500).json({ error: 'Group not found' });
            }

            // Get group members
            const membersQuery = `
                SELECT u.id, u.username, u.email, gm.joined_at
                FROM users u
                JOIN group_members gm ON u.id = gm.user_id
                WHERE gm.group_id = ?
                ORDER BY gm.joined_at ASC
            `;

            db.all(membersQuery, [groupId], (err, members) => {
                if (err) {
                    return res.status(500).json({ error: 'Failed to get group members' });
                }

                res.json({
                    group: {
                        ...group,
                        members: members
                    }
                });
            });
        });
    });
});

// Leave group
router.post('/:groupId/leave', authenticateToken, (req, res) => {
    const groupId = req.params.groupId;
    const userId = req.userId;

    // Check if user is a member
    db.get('SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?', [groupId, userId], (err, membership) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }

        if (!membership) {
            return res.status(400).json({ error: 'Not a member of this group' });
        }

        // Check if user is the creator (can't leave own group)
        db.get('SELECT id FROM groups WHERE id = ? AND created_by = ?', [groupId, userId], (err, group) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }

            if (group) {
                return res.status(400).json({ error: 'Cannot leave your own group. Delete it instead.' });
            }

            // Remove user from group
            db.run('DELETE FROM group_members WHERE group_id = ? AND user_id = ?', [groupId, userId], function(err) {
                if (err) {
                    return res.status(500).json({ error: 'Failed to leave group' });
                }

                res.json({ message: 'Successfully left group' });
            });
        });
    });
});

// Delete group (only creator can do this)
router.delete('/:groupId', authenticateToken, (req, res) => {
    const groupId = req.params.groupId;
    const userId = req.userId;

    // Check if user is the creator
    db.get('SELECT id FROM groups WHERE id = ? AND created_by = ?', [groupId, userId], (err, group) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }

        if (!group) {
            return res.status(403).json({ error: 'Only group creator can delete the group' });
        }

        // Delete group (cascade will handle related data)
        db.run('DELETE FROM groups WHERE id = ?', [groupId], function(err) {
            if (err) {
                return res.status(500).json({ error: 'Failed to delete group' });
            }

            res.json({ message: 'Group deleted successfully' });
        });
    });
});

// Generate a unique invite code
function generateInviteCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

module.exports = router;
