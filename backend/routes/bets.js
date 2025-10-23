const express = require('express');
const db = require('../database');
const { authenticateToken } = require('../auth');
const { sendBetReminder, sendBetDeadlineNotification, sendBetResultNotification } = require('../emailService');
const Joi = require('joi');
const cron = require('node-cron');

const router = express.Router();

// Comments routes will be added after bets routes

// Input validation schemas
const createBetSchema = Joi.object({
    groupId: Joi.number().integer().required(),
    description: Joi.string().min(5).max(500).required(),
    deadline: Joi.date().greater('now').required(),
    stake: Joi.string().min(1).max(200).required(),
    emoji: Joi.string().max(10).optional() // Allow emojis up to 10 characters
});

const voteSchema = Joi.object({
    vote: Joi.string().valid('favor', 'contra').required()
});

const commentSchema = Joi.object({
    comment: Joi.string().min(1).max(500).required()
});

// Create a new bet
router.post('/', authenticateToken, (req, res) => {
    console.log('POST /bets - Request body:', req.body);
    console.log('POST /bets - User ID:', req.userId);

    const { error, value } = createBetSchema.validate(req.body);
    if (error) {
        console.log('Joi validation error:', error.details[0].message);
        return res.status(400).json({ error: error.details[0].message });
    }

    const { groupId, description, deadline, stake, emoji } = value;
    const userId = req.userId;

    console.log('Creating bet:', { groupId, description, deadline, stake, emoji, userId });

    // Check if user is a member of the group
    db.get('SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?', [groupId, userId], (err, membership) => {
        if (err) {
            console.error('Error checking membership:', err);
            return res.status(500).json({ error: 'Database error: ' + err.message });
        }

        if (!membership) {
            return res.status(403).json({ error: 'You are not a member of this group' });
        }

        // Create the bet
        db.run('INSERT INTO bets (group_id, description, deadline, stake, created_by, emoji) VALUES (?, ?, ?, ?, ?, ?)',
            [groupId, description, deadline, stake, userId, emoji || ''],
            function(err) {
                if (err) {
                    console.error('Error creating bet:', err);
                    return res.status(500).json({ error: 'Failed to create bet: ' + err.message });
                }

                const betId = this.lastID;

                res.status(201).json({
                    message: 'Bet created successfully',
                    bet: {
                        id: betId,
                        groupId,
                        description,
                        deadline,
                        stake,
                        createdBy: userId,
                        status: 'pending'
                    }
                });
            }
        );
    });
});

// Vote on a bet
router.post('/:betId/vote', authenticateToken, (req, res) => {
    const { error, value } = voteSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ error: error.details[0].message });
    }

    const { vote } = value;
    const betId = req.params.betId;
    const userId = req.userId;

    // Check if bet exists and is pending
    db.get('SELECT group_id, status FROM bets WHERE id = ?', [betId], (err, bet) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }

        if (!bet) {
            return res.status(404).json({ error: 'Bet not found' });
        }

        if (bet.status !== 'pending') {
            return res.status(400).json({ error: 'Cannot vote on completed bets' });
        }

        // Check if user is a member of the group
        db.get('SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?', [bet.group_id, userId], (err, membership) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }

            if (!membership) {
                return res.status(403).json({ error: 'You are not a member of this group' });
            }

            // Check if user already voted
            db.get('SELECT 1 FROM bet_votes WHERE bet_id = ? AND user_id = ?', [betId, userId], (err, existingVote) => {
                if (err) {
                    return res.status(500).json({ error: 'Database error' });
                }

                if (existingVote) {
                    return res.status(409).json({ error: 'You have already voted on this bet' });
                }

                // Add vote
                db.run('INSERT INTO bet_votes (bet_id, user_id, vote) VALUES (?, ?, ?)',
                    [betId, userId, vote],
                    function(err) {
                        if (err) {
                            return res.status(500).json({ error: 'Failed to cast vote' });
                        }

                        res.json({
                            message: 'Vote cast successfully',
                            vote: vote
                        });
                    }
                );
            });
        });
    });
});

// Get bets for a specific group
router.get('/group/:groupId', authenticateToken, (req, res) => {
    const groupId = req.params.groupId;
    const userId = req.userId;

    // Check if user is a member of the group
    db.get('SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?', [groupId, userId], (err, membership) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }

        if (!membership) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const query = `
            SELECT
                b.id, b.description, b.deadline, b.stake, b.status, b.result, b.created_at, b.completed_at, b.emoji,
                u.username as creator_name,
                u.id = ? as is_creator,
                COUNT(bv.user_id) as total_votes,
                (SELECT COUNT(*) FROM group_members WHERE group_id = b.group_id) as potential_voters
            FROM bets b
            LEFT JOIN users u ON b.created_by = u.id
            LEFT JOIN bet_votes bv ON b.id = bv.bet_id
            WHERE b.group_id = ?
            GROUP BY b.id
            ORDER BY b.created_at DESC
        `;

        db.all(query, [userId, groupId], (err, bets) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }

            // Get votes for each bet
            const betsWithVotes = bets.map(bet => ({
                ...bet,
                userHasVoted: false,
                userVote: null
            }));

            // Get user's votes for these bets
            const userVotesQuery = `
                SELECT bet_id, vote FROM bet_votes
                WHERE user_id = ? AND bet_id IN (${bets.map(b => b.id).join(',')})
            `;

            if (bets.length > 0) {
                db.all(userVotesQuery, [userId], (err, votes) => {
                    if (err) {
                        return res.status(500).json({ error: 'Database error' });
                    }

                    votes.forEach(vote => {
                        const bet = betsWithVotes.find(b => b.id === vote.bet_id);
                        if (bet) {
                            bet.userHasVoted = true;
                            bet.userVote = vote.vote;
                        }
                    });

                    res.json({ bets: betsWithVotes });
                });
            } else {
                res.json({ bets: betsWithVotes });
            }
        });
    });
});

// Get specific bet details
router.get('/:betId', authenticateToken, (req, res) => {
    const betId = req.params.betId;
    const userId = req.userId;

    const betQuery = `
        SELECT
            b.*,
            u.username as creator_name,
            u.id = ? as is_creator,
            g.name as group_name,
            COUNT(bv.user_id) as total_votes
        FROM bets b
        LEFT JOIN users u ON b.created_by = u.id
        LEFT JOIN groups g ON b.group_id = g.id
        LEFT JOIN bet_votes bv ON b.id = bv.bet_id
        WHERE b.id = ?
        GROUP BY b.id
    `;

    db.get(betQuery, [userId, betId], (err, bet) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }

        if (!bet) {
            return res.status(404).json({ error: 'Bet not found' });
        }

        // Check if user is a member of the group
        db.get('SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?', [bet.group_id, userId], (err, membership) => {
            if (err || !membership) {
                return res.status(403).json({ error: 'Access denied' });
            }

            // Get all votes for this bet
            const votesQuery = `
                SELECT u.username, bv.vote, bv.voted_at
                FROM bet_votes bv
                JOIN users u ON bv.user_id = u.id
                WHERE bv.bet_id = ?
                ORDER BY bv.voted_at ASC
            `;

            db.all(votesQuery, [betId], (err, votes) => {
                if (err) {
                    return res.status(500).json({ error: 'Database error' });
                }

                // Check user's vote
                const userVote = votes.find(v => v.username === bet.creator_name);
                const voteCounts = votes.reduce((acc, vote) => {
                    acc[vote.vote] = (acc[vote.vote] || 0) + 1;
                    return acc;
                }, {});

                res.json({
                    bet: {
                        ...bet,
                        votes: votes,
                        voteCounts: voteCounts,
                        userHasVoted: userVote ? true : false,
                        userVote: userVote ? userVote.vote : null
                    }
                });
            });
        });
    });
});

// Resolve a bet (only creator can do this)
router.post('/:betId/resolve', authenticateToken, (req, res) => {
    const betId = req.params.betId;
    const userId = req.userId;
    const { result } = req.body;

    if (!result || !['won', 'lost'].includes(result)) {
        return res.status(400).json({ error: 'Invalid result. Must be "won" or "lost"' });
    }

    // Check if bet exists and user is creator
    db.get('SELECT * FROM bets WHERE id = ? AND created_by = ? AND status = "pending"',
        [betId, userId], (err, bet) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }

        if (!bet) {
            return res.status(404).json({ error: 'Bet not found or you are not the creator or bet is not pending' });
        }

        const now = new Date().toISOString();

        // Update bet status and result
        db.run('UPDATE bets SET status = "completed", result = ?, completed_at = ? WHERE id = ?',
            [result, now, betId],
            function(err) {
                if (err) {
                    return res.status(500).json({ error: 'Failed to resolve bet' });
                }

                // Send result notification
                try {
                    sendBetResultNotification(betId, bet.group_name, bet.description, result, bet.stake);
                } catch (emailError) {
                    console.error('Error sending result notification:', emailError);
                }

                res.json({
                    message: 'Bet resolved successfully',
                    result: result
                });
            }
        );
    });
});

// Schedule notification jobs
// This runs every hour to check for upcoming deadlines and expired bets
cron.schedule('0 * * * *', async () => {
    try {
        console.log('Running bet notification check...');

        // Check for bets expiring in 24 hours
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString();

        const expiringSoonQuery = `
            SELECT b.id, b.description, b.deadline, g.name as group_name
            FROM bets b
            JOIN groups g ON b.group_id = g.id
            WHERE b.status = 'pending'
            AND datetime(b.deadline) BETWEEN datetime('now') AND datetime(?)
        `;

        db.all(expiringSoonQuery, [tomorrowStr], (err, expiringBets) => {
            if (err) {
                console.error('Error checking expiring bets:', err);
                return;
            }

            // Send reminder emails
            expiringBets.forEach(bet => {
                sendBetReminder(bet.id, bet.group_name, bet.description, bet.deadline);
            });
        });

        // Check for expired bets that need resolution notification
        const expiredQuery = `
            SELECT b.id, b.description, b.deadline, g.name as group_name
            FROM bets b
            JOIN groups g ON b.group_id = g.id
            WHERE b.status = 'pending'
            AND datetime(b.deadline) <= datetime('now')
        `;

        db.all(expiredQuery, [], (err, expiredBets) => {
            if (err) {
                console.error('Error checking expired bets:', err);
                return;
            }

            // Send deadline reached notifications
            expiredBets.forEach(bet => {
                sendBetDeadlineNotification(bet.id, bet.group_name, bet.description);
            });
        });

    } catch (error) {
        console.error('Error in scheduled bet check:', error);
    }
});

// Comments routes

// Get bet comments
router.get('/:betId/comments', authenticateToken, (req, res) => {
    const betId = req.params.betId;
    const userId = req.userId;

    // Verify user has access to this bet (is member of the group)
    db.get('SELECT b.group_id FROM bets b WHERE b.id = ?', [betId], (err, bet) => {
        if (err || !bet) {
            return res.status(404).json({ error: 'Bet not found' });
        }

        // Check if user is a member of the group
        db.get('SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?', [bet.group_id, userId], (err, membership) => {
            if (err || !membership) {
                return res.status(403).json({ error: 'Access denied' });
            }

            // Get comments
            const query = `
                SELECT bc.id, bc.comment, bc.created_at, bc.user_id, u.username
                FROM bet_comments bc
                JOIN users u ON bc.user_id = u.id
                WHERE bc.bet_id = ?
                ORDER BY bc.created_at DESC
            `;

            db.all(query, [betId], (err, comments) => {
                if (err) {
                    return res.status(500).json({ error: 'Database error' });
                }

                res.json({ comments: comments || [] });
            });
        });
    });
});

// Create comment
router.post('/:betId/comments', authenticateToken, (req, res) => {
    const { error, value } = commentSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ error: error.details[0].message });
    }

    const betId = req.params.betId;
    const userId = req.userId;
    const { comment } = value;

    // Verify user has access to this bet (is member of the group)
    db.get('SELECT b.group_id FROM bets b WHERE b.id = ?', [betId], (err, bet) => {
        if (err || !bet) {
            return res.status(404).json({ error: 'Bet not found' });
        }

        // Check if user is a member of the group
        db.get('SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?', [bet.group_id, userId], (err, membership) => {
            if (err || !membership) {
                return res.status(403).json({ error: 'Access denied' });
            }

            // Get username for response
            db.get('SELECT username FROM users WHERE id = ?', [userId], (err, user) => {
                if (err) {
                    return res.status(500).json({ error: 'Database error' });
                }

                // Create comment
                db.run('INSERT INTO bet_comments (bet_id, user_id, comment) VALUES (?, ?, ?)',
                    [betId, userId, comment],
                    function(err) {
                        if (err) {
                            return res.status(500).json({ error: 'Failed to create comment' });
                        }

                        res.status(201).json({
                            message: 'Comment created successfully',
                            comment: {
                                id: this.lastID,
                                bet_id: betId,
                                user_id: userId,
                                comment: comment,
                                created_at: new Date().toISOString(),
                                username: user.username
                            }
                        });
                    }
                );
            });
        });
    });
});

module.exports = router;
