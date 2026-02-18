# Cortex Clash

Cortex Clash is a production-grade, full-stack esports tournament management platform designed to power competitive gaming ecosystems. It supports multiple game titles, automated tournament brackets, intelligent matchmaking, real-time match reporting, and season-based competitive ladders.

## Features

- **Multi-Game Support**: Native support for **Valorant**, **CS2**, **League of Legends**, **Dota 2**, **PUBG Mobile**, and **Free Fire** with game-specific scoring rules (Round-based, Win/Loss, Points/Placement).
- **Advanced Tournament Engine**: 
  - Dynamic Bracket Generation (Single/Double Elimination, Round Robin).
  - Automated Scheduling & Match Creation.
  - Game-specific Match Rooms with tailored result submission forms.
- **Competitive Integrity**:
  - **Elo Rating System**: Game-specific MMR tracking with custom weighting for different scoring types.
  - **Seasons**: Time-boxed competitive cycles with persistent history and leaderboards.
  - **Match Verification**: Two-step result verification process (Submission -> Confirmation/Dispute).
- **Analytics Dashboard**: 
  - Comprehensive player performance tracking (Win Rate, Consistency, Elo History).
  - Game-breakdown stats.
  - Tournament-level engagement metrics.
- **Role-Based Access Control**:
  - **Players**: Register, compete, track stats.
  - **Organizers**: Create tournaments, manage brackets, resolve disputes.
  - **Admins**: Manage games, seasons, and platform settings.

## Tech Stack

- **Frontend**: React (Vite), Tailwind CSS, Framer Motion, Lucide React, Recharts.
- **Backend**: Node.js, Express, MongoDB (Mongoose).
- **Real-time**: Socket.io for live match updates.
- **Security**: JWT Authentication, Helmet, Rate Limiting, Input Sanitization.

## Getting Started

### Prerequisites

- Node.js (v18+)
- MongoDB (Local or Atlas)

### Installation

1.  **Install dependencies**

    ```bash
    # Install root/script dependencies if any
    npm install

    # Install Client
    cd client
    npm install

    # Install Server
    cd ../server
    npm install
    ```

2.  **Environment Variables**

    Create `server/.env`:
    ```env
    PORT=5000
    MONGO_URI=mongodb://localhost:27017/cortex_clash
    JWT_SECRET=your_secure_secret_key_here
    CLIENT_URL=http://localhost:5173
    NODE_ENV=development
    ```

    Create `client/.env`:
    ```env
    VITE_API_URL=http://localhost:5000
    ```

### Running Locally

1.  **Seed Database (Optional for new setup)**:
    ```bash
    # Seed Games & Initial Season
    node scripts/seed_games.js
    curl -X POST http://localhost:5000/api/v1/seasons/seed
    
    # Create Admin User (Optional)
    node scripts/seed_admin.js
    ```

    **Default Admin Credentials:**
    - Email: `admin@cortexclash.com`
    - Password: `adminpassword123`

2.  **Start Backend**:
    ```bash
    cd server
    npm run dev
    ```

3.  **Start Frontend**:
    ```bash
    cd client
    npm run dev
    ```

## Project Structure

- `/client`: React Frontend application.
- `/server`: Express Backend API.
- `/scripts`: Utility scripts for seeding and verification.
- `/docs`: Additional documentation and architecture diagrams.

## License

MIT
