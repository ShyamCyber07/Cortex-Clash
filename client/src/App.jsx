import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import TournamentList from './pages/Tournament/TournamentList';
import CreateTournament from './pages/Tournament/CreateTournament';
import TournamentDetails from './pages/Tournament/TournamentDetails';
import MatchRoom from './pages/Tournament/MatchRoom';
import Rankings from './pages/Rankings';
import AdminDashboard from './pages/Admin/AdminDashboard';
import UserManagement from './pages/Admin/UserManagement';
import GameSettings from './pages/Admin/GameSettings';
import SeasonManagement from './pages/Admin/SeasonManagement';
import Debug from './pages/Debug';
import ProtectedRoute from './components/ProtectedRoute';
import { SocketProvider } from './context/SocketContext';
import { AuthProvider } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <SocketProvider>
        <AuthProvider>
          <Router>
            <div className="min-h-screen bg-slate-900 text-white font-sans selection:bg-indigo-500 selection:text-white">
              <Navbar />
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/admin/users" element={<UserManagement />} />
                  <Route path="/admin/games" element={<GameSettings />} />
                  <Route path="/admin/seasons" element={<SeasonManagement />} />
                </Route>

                <Route path="/rankings" element={<Rankings />} />
                <Route path="/tournaments" element={<TournamentList />} />
                <Route path="/tournaments/create" element={<CreateTournament />} />
                <Route path="/tournaments/:id" element={<TournamentDetails />} />
                <Route path="/matches/:id" element={<MatchRoom />} />
                <Route path="/debug" element={<Debug />} />
              </Routes>
            </div>
          </Router>
        </AuthProvider>
      </SocketProvider>
    </ErrorBoundary>
  );
}

export default App;
