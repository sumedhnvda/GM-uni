import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, MessageSquare, LogOut, Sprout, ChevronDown, ChevronRight } from 'lucide-react';
import api from '../services/api';

const Layout: React.FC = () => {
    const navigate = useNavigate();
    const [chats, setChats] = useState<any[]>([]);
    const [analyses, setAnalyses] = useState<any[]>([]);
    const [showChats, setShowChats] = useState(true);
    const [showAnalyses, setShowAnalyses] = useState(true);
    const [userProfile, setUserProfile] = useState<any>(null);

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    // Fetch History & Profile
    useEffect(() => {
        const fetchData = async () => {
            const token = localStorage.getItem('token');
            if (!token) return;

            try {
                // Fetch Chats
                const chatRes = await api.get('/history/chats', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setChats(chatRes.data);

                // Fetch Analyses
                const analysisRes = await api.get('/history/analyses', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setAnalyses(analysisRes.data);

                // Fetch Profile
                const profileRes = await api.get('/users/me', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setUserProfile(profileRes.data);
            } catch (error) {
                console.error("Error fetching history", error);
            }
        };
        fetchData();
    }, []);

    const isProfileComplete = userProfile && userProfile.location && userProfile.land_size && userProfile.crops_grown;

    const navItems = [
        { path: '/choice', icon: LayoutDashboard, label: 'Home' },
        ...(isProfileComplete ? [
            { path: '/dashboard', icon: Sprout, label: 'New Analysis' },
            { path: '/chat', icon: MessageSquare, label: 'New Chat' },
        ] : []),
    ];

    return (
        <div className="flex h-screen bg-gray-50">
            {/* Sidebar */}
            <aside className="w-72 bg-white/80 backdrop-blur-xl border-r border-gray-100 hidden md:flex flex-col">
                <div className="p-6 flex items-center gap-3 border-b border-gray-100 bg-gradient-to-r from-emerald-500 to-teal-500">
                    <div className="p-2 bg-white/20 rounded-xl">
                        <Sprout className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-xl font-bold text-white">Cropic</span>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {/* Main Nav */}
                    <nav className="space-y-1">
                        {navItems.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={({ isActive }) =>
                                    `flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${isActive
                                        ? 'bg-green-50 text-green-700 font-medium'
                                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                    }`
                                }
                            >
                                <item.icon className="w-5 h-5" />
                                {item.label}
                            </NavLink>
                        ))}
                    </nav>

                    {/* Recent Chats */}
                    <div>
                        <button
                            onClick={() => setShowChats(!showChats)}
                            className="flex items-center justify-between w-full text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2 hover:text-gray-600"
                        >
                            Recent Chats
                            {showChats ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        </button>
                        {showChats && (
                            <div className="space-y-1">
                                {chats.map((chat: any) => (
                                    <button
                                        key={chat._id}
                                        onClick={() => navigate('/chat', { state: { chat } })}
                                        className="w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg truncate transition-colors"
                                    >
                                        {chat.title || "Untitled Chat"}
                                    </button>
                                ))}
                                {chats.length === 0 && <p className="text-xs text-gray-400 px-4">No recent chats</p>}
                            </div>
                        )}
                    </div>

                    {/* Recent Analyses */}
                    <div>
                        <button
                            onClick={() => setShowAnalyses(!showAnalyses)}
                            className="flex items-center justify-between w-full text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2 hover:text-gray-600"
                        >
                            Deep Analyses
                            {showAnalyses ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        </button>
                        {showAnalyses && (
                            <div className="space-y-1">
                                {analyses.map((analysis: any) => (
                                    <button
                                        key={analysis._id}
                                        onClick={() => navigate('/dashboard', { state: { analysis } })}
                                        className="w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg truncate transition-colors"
                                    >
                                        {analysis.location} - {new Date(analysis.created_at).toLocaleDateString()}
                                    </button>
                                ))}
                                {analyses.length === 0 && <p className="text-xs text-gray-400 px-4">No analyses yet</p>}
                            </div>
                        )}
                    </div>
                </div>

                {/* User Profile Footer */}
                <div className="p-4 border-t border-gray-100 space-y-3">
                    <NavLink to="/profile" className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-xl transition-colors">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-bold">
                            U
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">My Profile</p>
                            <p className="text-xs text-gray-500 truncate">View Settings</p>
                        </div>
                    </NavLink>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-2 w-full text-left text-red-600 hover:bg-red-50 rounded-xl transition-colors text-sm"
                    >
                        <LogOut className="w-4 h-4" />
                        Logout
                    </button>
                </div>
            </aside>

            {/* Mobile Header (Visible only on small screens) */}
            <div className="md:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-200 p-4 z-50 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Sprout className="w-6 h-6 text-green-600" />
                    <span className="font-bold text-gray-800">Cropic</span>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={handleLogout} className="text-gray-600">
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto pt-16 md:pt-0">
                <Outlet />
            </main>

            {/* Mobile Bottom Nav */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around p-4 z-50">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `flex flex-col items-center gap-1 ${isActive ? 'text-green-600' : 'text-gray-400'
                            }`
                        }
                    >
                        <item.icon className="w-6 h-6" />
                        <span className="text-xs">{item.label}</span>
                    </NavLink>
                ))}
            </nav>
        </div>
    );
};

export default Layout;
