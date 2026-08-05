# AegisCare HMS - Setup Instructions

Follow these steps to run the complete project locally.

## 1. Database Setup (PostgreSQL)

1. Make sure you have **PostgreSQL** installed on your machine and that the service is running.
2. Create a new database named `hms-db`. 
   *(You can use a GUI like pgAdmin or run `CREATE DATABASE "hms-db";` in psql)*
3. Navigate to the backend folder:
   ```bash
   cd backend
   ```
4. Configure your database URL. The `.env` file inside the `backend` folder should have your connection string, for example:
   ```env
   DATABASE_URL=postgresql+psycopg2://postgres:YOUR_PASSWORD@127.0.0.1:5432/hms-db
   ```
5. Run the database seeder to create all tables and generate default data (users, patients, medicines, etc.):
   ```bash
   python seed_db.py
   ```

## 2. Start the Backend API (FastAPI)

1. Stay in the `backend/` directory.
2. Install the required Python packages (if you haven't already):
   ```bash
   pip install -r requirements.txt
   ```
3. Run the development server using uvicorn:
   ```bash
   python -m uvicorn app.main:app --reload --port 8000
   ```
4. The backend is now running at `http://localhost:8000`. 
   *(You can view the interactive API docs at `http://localhost:8000/docs`)*

## 3. Start the Frontend (React / Vite)

1. Open a **new** terminal window/tab.
2. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
3. Install the required Node.js packages:
   ```bash
   npm install
   ```
4. The frontend is already configured to talk to `http://localhost:8000` via the `.env` file (`VITE_API_URL=http://localhost:8000`).
5. Start the frontend development server:
   ```bash
   npm run dev
   ```
6. Open your browser and go to `http://localhost:3000`.

---

## 🔐 Default Test Accounts

Use these credentials to log in and test the different modules of the hospital system:

| Role | Username (Email) | Password |
| :--- | :--- | :--- |
| **Admin** | `admin@hms.com` | `123456` |
| **Receptionist** | `reception@hms.com` | `123456` |
| **Doctor** | `doctor@hms.com` | `123456` |
| **Lab Technician** | `lab@hms.com` | `123456` |
| **Pharmacist** | `pharmacy@hms.com` | `123456` |
