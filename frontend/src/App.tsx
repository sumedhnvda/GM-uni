import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Form from './pages/Form';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Chatbot from './components/Chatbot';
import Home from './pages/Home';
import Layout from './components/Layout';
import Choice from './pages/Choice';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />

          {/* Authenticated Routes Wrapped in Layout */}
          <Route element={<Layout />}>
            <Route path="/choice" element={<Choice />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/form" element={<Form />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/chat" element={
              <div className="h-full p-4">
                <Chatbot mode="full" />
              </div>
            } />
          </Route>
        </Routes>
      </div>
    </Router>
  );
}

export default App;
