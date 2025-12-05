import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import Login from './pages/Login';
import Form from './pages/Form';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Chatbot from './components/Chatbot';
import Home from './pages/Home';
import Layout from './components/Layout';
import Choice from './pages/Choice';
import LiveCall from './pages/LiveCall';
import Admin from './pages/Admin';
import Community from './pages/Community';
import ProtectedRoute from './components/ProtectedRoute';
import NotFound from './pages/NotFound';

// Replace with your actual Google Client ID
const GOOGLE_CLIENT_ID = "654672249010-0d7v7ik6g1lqkgt8cdec4lcapl5h3g2d.apps.googleusercontent.com";

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <Router>
        <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />

            {/* Authenticated Routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/choice" element={<Choice />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/form" element={<Form />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/live" element={<LiveCall />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/community" element={<Community />} />
                <Route path="/chat" element={
                  <div className="h-full p-4">
                    <Chatbot mode="full" />
                  </div>
                } />
              </Route>
            </Route>

            {/* 404 Catch-all Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </Router>
    </GoogleOAuthProvider>
  );
}

export default App;
