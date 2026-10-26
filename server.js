require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'university_api',
  waitForConnections: true,
  connectionLimit: 10
}).promise();

const ADMIN_API_KEY = 'admin123';

function getApiKey(req) {
  return req.get('x-api-key');
}

function requireAdmin(req, res, next) {
  if (!getApiKey(req) || getApiKey(req) !== ADMIN_API_KEY) {
    return res.status(401).json({ message: 'Invalid or missing admin API key.' });
  }
  next();
}

// Validates the user's key and counts each successful authenticated API request.
// The user identity comes from the database key record, never from URL parameters.
async function requireUser(req, res, next) {
  try {
    const key = getApiKey(req);
    if (!key) return res.status(401).json({ message: 'Send your API key in the x-api-key header.' });

    const [rows] = await db.query(
      `SELECT id, user_type, user_id, request_limit, requests_used, status
       FROM api_keys WHERE api_key = ? LIMIT 1`, [key]
    );
    if (!rows.length) return res.status(401).json({ message: 'Invalid API key.' });

    const user = rows[0];
    if (user.status !== 'active') return res.status(403).json({ message: 'This API key has been revoked.' });
    if (user.requests_used >= user.request_limit) {
      return res.status(429).json({ message: 'Request limit reached for this API key.' });
    }

    await db.query('UPDATE api_keys SET requests_used = requests_used + 1 WHERE id = ?', [user.id]);
    req.currentUser = user;
    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not validate API key.' });
  }
}

app.get('/api/health', (req, res) => res.json({ message: 'University API is running.' }));

// Admin endpoints: all are protected by the predefined admin key.
app.get('/api/admin/students', requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, roll_no, full_name, email, department, semester FROM students ORDER BY id');
    res.json(rows);
  } catch (e) { res.status(500).json({ message: 'Could not load students.' }); }
});

app.get('/api/admin/teachers', requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, employee_no, full_name, email, department FROM teachers ORDER BY id');
    res.json(rows);
  } catch (e) { res.status(500).json({ message: 'Could not load teachers.' }); }
});

app.get('/api/admin/keys', requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT k.id, k.api_key, k.user_type, k.user_id, k.request_limit, k.requests_used,
       k.status, k.created_at,
       CASE WHEN k.user_type='student' THEN s.full_name ELSE t.full_name END AS user_name
       FROM api_keys k
       LEFT JOIN students s ON k.user_type='student' AND k.user_id=s.id
       LEFT JOIN teachers t ON k.user_type='teacher' AND k.user_id=t.id
       ORDER BY k.id DESC`
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ message: 'Could not load API keys.' }); }
});

app.post('/api/admin/keys', requireAdmin, async (req, res) => {
  try {
    const { user_type, user_id, request_limit } = req.body;
    const limit = Number(request_limit);
    if (!['student', 'teacher'].includes(user_type) || !Number.isInteger(Number(user_id)) ||
        Number(user_id) < 1 || !Number.isInteger(limit) || limit < 1) {
      return res.status(400).json({ message: 'Choose a valid user type, user ID, and positive request limit.' });
    }
    const table = user_type === 'student' ? 'students' : 'teachers';
    const [person] = await db.query(`SELECT id FROM ${table} WHERE id = ?`, [Number(user_id)]);
    if (!person.length) return res.status(404).json({ message: 'User not found.' });

    const apiKey = crypto.randomBytes(24).toString('hex');
    await db.query(
      'INSERT INTO api_keys (api_key, user_type, user_id, request_limit) VALUES (?, ?, ?, ?)',
      [apiKey, user_type, Number(user_id), limit]
    );
    res.status(201).json({ message: 'API key generated.', api_key: apiKey });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Could not generate API key.' });
  }
});

app.patch('/api/admin/keys/:id/limit', requireAdmin, async (req, res) => {
  try {
    const limit = Number(req.body.request_limit);
    if (!Number.isInteger(limit) || limit < 1) return res.status(400).json({ message: 'Request limit must be a positive whole number.' });
    const [result] = await db.query('UPDATE api_keys SET request_limit = ? WHERE id = ?', [limit, req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ message: 'API key not found.' });
    res.json({ message: 'Request limit updated.' });
  } catch (e) { res.status(500).json({ message: 'Could not update request limit.' }); }
});

app.patch('/api/admin/keys/:id/revoke', requireAdmin, async (req, res) => {
  try {
    const [result] = await db.query("UPDATE api_keys SET status = 'revoked' WHERE id = ?", [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ message: 'API key not found.' });
    res.json({ message: 'API key revoked.' });
  } catch (e) { res.status(500).json({ message: 'Could not revoke API key.' }); }
});

// Students can only see the student associated with their key.
app.get('/api/student/me', requireUser, async (req, res) => {
  if (req.currentUser.user_type !== 'student') return res.status(403).json({ message: 'Student API key required.' });
  try {
    const [rows] = await db.query(
      'SELECT id, roll_no, full_name, email, department, semester FROM students WHERE id = ?',
      [req.currentUser.user_id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Student record not found.' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ message: 'Could not load student record.' }); }
});

app.get('/api/student/marks', requireUser, async (req, res) => {
  if (req.currentUser.user_type !== 'student') return res.status(403).json({ message: 'Student API key required.' });
  try {
    const [rows] = await db.query(
      'SELECT subject, marks_obtained, total_marks FROM academic_marks WHERE student_id = ? ORDER BY subject',
      [req.currentUser.user_id]
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ message: 'Could not load marks.' }); }
});

// Teachers can view all student records and marks.
app.get('/api/teacher/students', requireUser, async (req, res) => {
  if (req.currentUser.user_type !== 'teacher') return res.status(403).json({ message: 'Teacher API key required.' });
  try {
    const [rows] = await db.query(
      `SELECT s.id, s.roll_no, s.full_name, s.email, s.department, s.semester,
       m.subject, m.marks_obtained, m.total_marks
       FROM students s LEFT JOIN academic_marks m ON m.student_id=s.id
       ORDER BY s.id, m.subject`
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ message: 'Could not load student records.' }); }
});

app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/settings', (req, res) => res.sendFile(path.join(__dirname, 'public', 'settings.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'dashboard.html')));

app.use((req, res) => res.status(404).json({ message: 'Endpoint not found.' }));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`University API ready: http://localhost:${port}`));