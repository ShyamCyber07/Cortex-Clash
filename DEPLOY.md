# Deploying Cortex Clash

Requires:
1. Node.js Backend (Render or Railway recommended)
2. Static Frontend (Vercel recommended)
3. MongoDB Database (MongoDB Atlas)

## Backend Deployment (Render / Railway)
1. Push code to GitHub.
2. Create New Web Service.
3. Root Directory: `server`.
4. Build Command: `npm install`.
5. Start Command: `node index.js`.
6. Environment Variables:
   - `MONGO_URI`: Your MongoDB Atlas Connection String.
   - `JWT_SECRET`: A secure random string.
   - `CLIENT_URL`: The URL of your Vercel frontend.
   - `NODE_ENV`: `production`.

7. **Database Initialization (Post-Deploy)**:
   - Once deployed, you must seed the initial Games and Season.
   - You can do this by running the local script pointing to the remote DB (if IP allowlisted) or by using CURL against the deployed API if you temporarily open the `seed` endpoints (modify `seasonRoutes.js` access control if needed, or simply use the provided public dev routes).
   - Recommended: Connect to your MongoDB Atlas cluster via Compass and import the data, or run the `seed_games.js` script locally with `MONGO_URI` set to your prod DB string.
   - curl -X POST https://your-app.onrender.com/api/v1/seasons/seed

## Frontend Deployment (Vercel)
1. Import Project from GitHub.
2. Root Directory: `client`.
3. Framework Preset: Vite.
4. Environment Variables:
   - `VITE_API_URL`: The URL of your deployed Backend (e.g. `https://cortex-clash-api.onrender.com`).
   
## Validation Steps
1. Visit the deployed frontend URL.
2. Sign Up a new user.
3. Login.
4. Go to Tournaments > Create.
5. Create a test tournament.
6. Register (you are now participant 1).
7. Create another account in Incognito, register (participant 2).
8. As Organizer (first account), click "Start Tournament".
9. Verify Bracket appears.
10. Click Match > Submit Result.
11. Verify Bracket updates.
