# University API Access Management System

Beginner-friendly coursework project using HTML, CSS, AJAX (Fetch API), Node.js, Express.js and MySQL.

## Requirements
- Node.js and npm
- XAMPP (MySQL) or another MySQL server
- A browser and a code editor

## Setup step by step

1. Extract this ZIP file.
2. Open the extracted `university-api-management` folder in VS Code.
3. Start **MySQL** in XAMPP.
4. Open `http://localhost/phpmyadmin`, choose **Import**, select `schema.sql`, then click **Import/Go**. This creates the `university_api` database, tables, and sample records.
5. In VS Code, copy `.env.example` and rename the copy to `.env`.
6. Open `.env` and set your MySQL username/password if they differ from the defaults. Change `ADMIN_API_KEY` to a private value you choose.
7. Open VS Code Terminal in this folder and run:

   ```bash
   npm install
   npm start
   ```

8. Open these pages:
   - Admin panel: http://localhost:3000/admin
   - API key settings: http://localhost:3000/settings
   - Academic dashboard: http://localhost:3000/dashboard

## First use

1. Enter the `ADMIN_API_KEY` value from `.env` on the Admin page and click **Use Key**.
2. Load Students and Teachers. Their IDs are displayed in the tables.
3. Under Generate API Key, select `student` or `teacher`, enter the matching user ID and a request limit, then click **Generate Key**.
4. Copy the generated key from the result and give it to that user.
5. Open Settings, paste the key and click **Save Key**.
6. Open Dashboard and use the matching role's buttons.
   - Student key: My Information and My Marks.
   - Teacher key: Load All Student Records.
7. Admin can refresh key usage, change limits, or revoke keys.

## API endpoints

| Method | Endpoint | Access |
|---|---|---|
| GET | `/api/health` | Public health check |
| GET | `/api/admin/students` | Admin key |
| GET | `/api/admin/teachers` | Admin key |
| GET | `/api/admin/keys` | Admin key |
| POST | `/api/admin/keys` | Admin key; generates a key |
| PATCH | `/api/admin/keys/:id/limit` | Admin key |
| PATCH | `/api/admin/keys/:id/revoke` | Admin key |
| GET | `/api/student/me` | Student key; only the key owner's record |
| GET | `/api/student/marks` | Student key; only the key owner's marks |
| GET | `/api/teacher/students` | Teacher key; all student records and marks |

Send the API key in the HTTP header named `x-api-key`. Example:

```bash
curl -H "x-api-key: YOUR_KEY" http://localhost:3000/api/student/me
```

## Security and usage notes
- The server derives a student's identity from the API key record; it does not accept a student ID from the URL for student endpoints. Changing query parameters cannot reveal another student's data.
- Admin endpoints require the predefined admin key.
- Student keys cannot access teacher endpoints, and teacher keys cannot access student-only endpoints.
- Each authenticated user API request increments `requests_used` in MySQL. Once usage reaches the configured limit, the server returns HTTP `429`.
- Missing/invalid key: `401`; revoked key or wrong role: `403`; request limit reached: `429`; missing endpoint: `404`; server/database errors: `500`.
- This is an educational demo. For production, use HTTPS, authentication for the admin page, stronger secret management, rate limiting by IP, audit logs, and consider hashing stored API keys. The demo admin key is configured through `.env`; never publish a real secret.
- Browser `localStorage` is used to demonstrate saving the assigned key. Do not use this storage pattern for sensitive production applications.

## Troubleshooting
- `Access denied for user 'root'`: check `DB_USER` and `DB_PASSWORD` in `.env`.
- `Unknown database`: import `schema.sql` in phpMyAdmin.
- `Cannot find module`: run `npm install` in the project folder.
- Port 3000 already in use: change `PORT` in `.env`.
