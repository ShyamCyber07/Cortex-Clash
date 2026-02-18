# Cortex Clash - Production Build & Release Guide

## 1. System Overview
Cortex Clash is a real-time esports tournament platform built with the MERN stack (MongoDB, Express, React, Node.js) and Socket.IO for live updates.

### key Components
- **API Server**: REST API + Socket.IO Server (Port 5000/Configurable)
- **Client**: React SPA (Vite)
- **Database**: MongoDB Atlas
- **Authentication**: JWT-based (HttpOnly cookies recommended for next iteration, currently Bearer token)

## 2. Environment Configuration

### Backend (.env)
```env
# Server
PORT=5000
NODE_ENV=production
CLIENT_URL=https://your-frontend-domain.com

# Database
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/cortex-clash

# Security
JWT_SECRET=your_super_secret_long_random_string_here
```

### Frontend (.env)
```env
VITE_API_URL=https://your-backend-api.com
```

## 3. Release Checklist

### Pre-Deployment
- [ ] **Health Check**: Verify `/api/v1/health` returns `OK` and DB status.
- [ ] **Configuration**: Ensure `MONGO_URI` and `JWT_SECRET` are set in the production environment.
- [ ] **Security**: 
    - [ ] `NODE_ENV` set to `production`.
    - [ ] `CLIENT_URL` correctly matches the frontend domain (CORS).
    - [ ] Rate limits are active.
- [ ] **Build**: Run `npm run build` in client directory to generate static assets.

### Verification Steps
1. **Login/Signup**: Create a user and verify JWT token generation.
2. **WebSocket**: Open `/debug` page on frontend, check connection status.
3. **Tournament Flow**:
    - Create a tournament.
    - Join with 2 accounts.
    - Start tournament.
    - Verify match creation in DB.
4. **Real-time Match**:
    - User A opens Match Room.
    - User B submits result.
    - User A sees "Verification Pending" instantly (Socket).
    - User A confirms result.
    - Match completes, brackets update.
5. **Analytics**:
    - Check Dashboard for updated ELO and win rate.
    - Verify Audit Logs in DB for the match interactions.

## 4. Operational Notes
- **Logs**: Backend logs actions with `[MATCH]`, `[ERROR]`, `[AUTH]` prefixes. In production, stream these to CloudWatch/Datadog.
- **Scaling**: 
    - The Node.js server is stateful due to Socket.IO.
    - For horizontal scaling, use **Redis Adapter** for Socket.IO (future upgrade).
- **Updates**:
    - Frontend is static; can be deployed via CDN/Edge (Vercel/Netlify).
    - Backend requires restart for code changes.

## 5. API Reference (v1)
- `GET /api/v1/health`: System status
- `POST /api/v1/matches/:id/result`: Submit match result (Idempotent)
- `POST /api/v1/matches/:id/confirm`: Confirm result (Idempotent)
- `GET /api/v1/analytics/player/:id`: Player stats
