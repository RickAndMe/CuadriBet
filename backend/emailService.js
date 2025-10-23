const nodemailer = require('nodemailer');
const db = require('./database');

// Email transporter configuration
// Email transporter configuration
const transporter = nodemailer.createTransport({
    service: 'gmail', // You can change this to any email service
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS // App password, not regular password
    }
});

// Send bet reminder email (24 hours before deadline)
const sendBetReminder = async (betId, groupName, betDescription, deadline) => {
    try {
        // Get all group members emails
        const emails = await getGroupMembersEmails(betId);

        if (emails.length === 0) return;

        const subject = `Recordatorio: Apuesta expira mañana - ${groupName}`;
        const html = `
            <h2>¡Recordatorio de apuesta!</h2>
            <p><strong>Grupo:</strong> ${groupName}</p>
            <p><strong>Apuesta:</strong> ${betDescription}</p>
            <p><strong>Fecha límite:</strong> ${new Date(deadline).toLocaleDateString('es-ES')}</p>
            <p>Haz tu votación si aún no lo has hecho.</p>
            <p>Asiste al botón de "Votar" para elegir tu opción.</p>
            <br>
            <small>Este es un mensaje automático de tu app de apuestas.</small>
        `;

        await sendEmail(emails, subject, html);
        console.log(`Reminder sent for bet ${betId}`);
    } catch (error) {
        console.error('Error sending bet reminder:', error);
    }
};

// Send notification when bet deadline is reached
const sendBetDeadlineNotification = async (betId, groupName, betDescription) => {
    try {
        // Get all group members emails
        const emails = await getGroupMembersEmails(betId);

        if (emails.length === 0) return;

        const subject = `Apuesta expirada: Necesita resolución - ${groupName}`;
        const html = `
            <h2>¡Apuesta expirada!</h2>
            <p><strong>Grupo:</strong> ${groupName}</p>
            <p><strong>Apuesta:</strong> ${betDescription}</p>
            <p>La fecha límite se ha alcanzado. El creador debe marcar si se cumplió o no.</p>
            <br>
            <small>Este es un mensaje automático de tu app de apuestas.</small>
        `;

        await sendEmail(emails, subject, html);
        console.log(`Deadline notification sent for bet ${betId}`);
    } catch (error) {
        console.error('Error sending bet deadline notification:', error);
    }
};

// Send result notification when bet is resolved
const sendBetResultNotification = async (betId, groupName, betDescription, result, stake) => {
    try {
        // Get all group members emails and their votes
        const participants = await getBetParticipantsWithVotes(betId);

        if (participants.length === 0) return;

        const resultText = result === 'won' ? 'Se cumplió' : 'No se cumplió';
        const subject = `Resultado de apuesta - ${groupName}`;

        const html = `
            <h2>¡Resultado de apuesta!</h2>
            <p><strong>Grupo:</strong> ${groupName}</p>
            <p><strong>Apuesta:</strong> ${betDescription}</p>
            <p><strong>Resultado:</strong> ${resultText}</p>
            <p><strong>Premio:</strong> ${stake}</p>

            <h3>Ganadores:</h3>
            <ul>
                ${participants.filter(p => p.result).map(p =>
                    `<li>${p.username} (${p.vote === 'favor' ? 'A favor' : 'En contra'})</li>`
                ).join('')}
            </ul>

            <h3>Perdedores:</h3>
            <ul>
                ${participants.filter(p => !p.result).map(p =>
                    `<li>${p.username} (${p.vote === 'favor' ? 'A favor' : 'En contra'})</li>`
                ).join('')}
            </ul>

            <br>
            <small>Este es un mensaje automático de tu app de apuestas.</small>
        `;

        const emails = participants.map(p => p.email);
        await sendEmail(emails, subject, html);
        console.log(`Result notification sent for bet ${betId}`);
    } catch (error) {
        console.error('Error sending bet result notification:', error);
    }
};

// Helper function to send email
const sendEmail = async (toEmails, subject, html) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: toEmails.join(', '),
        subject: subject,
        html: html
    };

    const result = await transporter.sendMail(mailOptions);
    return result;
};

// Helper function to get group members emails for a bet
const getGroupMembersEmails = (betId) => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT DISTINCT u.email
            FROM users u
            JOIN group_members gm ON u.id = gm.user_id
            JOIN bets b ON gm.group_id = b.group_id
            WHERE b.id = ?
        `;

        db.all(query, [betId], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows.map(row => row.email));
            }
        });
    });
};

// Helper function to get participants with votes and determine winners/losers
const getBetParticipantsWithVotes = (betId) => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT u.username, u.email, bv.vote, bv.user_id
            FROM bet_votes bv
            JOIN users u ON bv.user_id = u.id
            WHERE bv.bet_id = ?
        `;

        db.all(query, [betId], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                // Need to get the bet result to determine winners/losers
                db.get('SELECT result FROM bets WHERE id = ?', [betId], (err, bet) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    // Determine if each participant won or lost
                    const participants = rows.map(row => ({
                        user_id: row.user_id,
                        username: row.username,
                        email: row.email,
                        vote: row.vote,
                        result: (bet.result === 'won' && row.vote === 'favor') ||
                               (bet.result === 'lost' && row.vote === 'contra')
                    }));

                    resolve(participants);
                });
            }
        });
    });
};

module.exports = {
    sendBetReminder,
    sendBetDeadlineNotification,
    sendBetResultNotification
};
