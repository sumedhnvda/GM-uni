import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, MessageSquare, LogOut, Sprout, ChevronDown, ChevronRight, Shield, Users, History, X } from 'lucide-react';
import api from '../services/api';

const Layout: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [chats, setChats] = useState<any[]>([]);
    const [analyses, setAnalyses] = useState<any[]>([]);
    const [showChats, setShowChats] = useState(true);
    const [showAnalyses, setShowAnalyses] = useState(true);
    const [userProfile, setUserProfile] = useState<any>(null);
    const [mobileHistoryOpen, setMobileHistoryOpen] = useState(false);

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    const fetchHistory = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const chatRes = await api.get('/history/chats', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setChats(chatRes.data);

            const analysisRes = await api.get('/history/analyses', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAnalyses(analysisRes.data);

            const profileRes = await api.get('/users/me', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUserProfile(profileRes.data);
        } catch (error) {
            console.error("Error fetching history", error);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, [location.pathname]);

    const isProfileComplete = userProfile && userProfile.location && userProfile.land_size && userProfile.crops_grown;

    const navItems = [
        { path: '/choice', icon: LayoutDashboard, label: 'Home' },
        ...(isProfileComplete ? [
            { path: '/community', icon: Users, label: 'Community' },
            { path: '/choice', icon: Sprout, label: 'Analysis', state: { openAnalysis: true } },
            { path: '/chat', icon: MessageSquare, label: 'Chat' },
        ] : []),
        ...(userProfile?.email === 'sumedhnavuda007@gmail.com' ? [
            { path: '/admin', icon: Shield, label: 'Admin' },
        ] : []),
    ];

    const getUserAvatar = () => {
        if (userProfile?.picture) {
            return (
                <img
                    src={userProfile.picture}
                    alt={userProfile.full_name || 'User'}
                    className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-sm"
                />
            );
        }
        const initial = userProfile?.full_name?.charAt(0) || userProfile?.email?.charAt(0) || 'U';
        return (
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm">
                {initial.toUpperCase()}
            </div>
        );
    };

    return (
        <div className="flex h-screen bg-gray-50">
            {/* Sidebar - Desktop */}
            <aside className="w-72 bg-white/80 backdrop-blur-xl border-r border-gray-100 hidden md:flex flex-col">
                <div
                    onClick={() => navigate('/choice')}
                    className="p-6 flex items-center gap-3 border-b border-gray-100 bg-gradient-to-r from-emerald-500 to-teal-500 cursor-pointer hover:opacity-90 transition-opacity"
                >
                    <div className="p-2 bg-white/20 rounded-xl">
                        <Sprout className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-xl font-bold text-white">Cropic</span>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide">
                    <nav className="space-y-1">
                        {navItems.map((item) => (
                            <NavLink
                                key={item.label}
                                to={item.path}
                                state={item.state}
                                className={({ isActive }) =>
                                    `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive && item.path !== '/choice'
                                        ? 'bg-emerald-50 text-emerald-700 font-medium shadow-sm'
                                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                    }`
                                }
                            >
                                <item.icon className="w-5 h-5" />
                                {item.label}
                            </NavLink>
                        ))}
                    </nav>

                    <div>
                        <button
                            onClick={() => setShowChats(!showChats)}
                            className="flex items-center justify-between w-full text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2 hover:text-gray-600 transition-colors"
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
                                        className="w-full text-left px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 rounded-xl truncate transition-colors"
                                    >
                                        {chat.title || "Untitled Chat"}
                                    </button>
                                ))}
                                {chats.length === 0 && <p className="text-xs text-gray-400 px-4 py-2">No recent chats</p>}
                            </div>
                        )}
                    </div>

                    <div>
                        <button
                            onClick={() => setShowAnalyses(!showAnalyses)}
                            className="flex items-center justify-between w-full text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2 hover:text-gray-600 transition-colors"
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
                                        className="w-full text-left px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 rounded-xl truncate transition-colors"
                                    >
                                        {analysis.location} - {new Date(analysis.created_at).toLocaleDateString()}
                                    </button>
                                ))}
                                {analyses.length === 0 && <p className="text-xs text-gray-400 px-4 py-2">No analyses yet</p>}
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-4 border-t border-gray-100 space-y-3">
                    <NavLink to="/profile" className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-xl transition-colors">
                        {userProfile?.picture ? (
                            <img src={userProfile.picture} alt="" className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                            <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center text-white font-bold">
                                {userProfile?.full_name?.charAt(0) || 'U'}
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{userProfile?.full_name || 'My Profile'}</p>
                            <p className="text-xs text-gray-500 truncate">View Settings</p>
                        </div>
                    </NavLink>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-2.5 w-full text-left text-red-600 hover:bg-red-50 rounded-xl transition-colors text-sm font-medium"
                    >
                        <LogOut className="w-4 h-4" />
                        Logout
                    </button>
                </div>
            </aside>

            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-b border-gray-200 px-4 py-3 z-50 safe-top">
                <div className="flex justify-between items-center">
                    <div
                        onClick={() => navigate('/choice')}
                        className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                    >
                        <div className="p-1.5 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg">
                            <Sprout className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-bold text-gray-800">Cropic</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setMobileHistoryOpen(true)}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <History className="w-5 h-5 text-gray-600" />
                        </button>
                        <button
                            onClick={handleLogout}
                            className="p-2 hover:bg-red-50 rounded-full transition-colors"
                            title="Logout"
                        >
                            <LogOut className="w-5 h-5 text-red-500" />
                        </button>
                        <NavLink to="/profile">
                            {getUserAvatar()}
                        </NavLink>
                    </div>
                </div>
            </div>

            {/* Mobile History Drawer */}
            {mobileHistoryOpen && (
                <div className="md:hidden fixed inset-0 z-[60]">
                    <div className="absolute inset-0 bg-black/30" onClick={() => setMobileHistoryOpen(false)} />
                    <div className="absolute right-0 top-0 bottom-0 w-72 bg-white shadow-2xl flex flex-col">
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
                            <span className="font-semibold">History</span>
                            <button onClick={() => setMobileHistoryOpen(false)} className="p-1 hover:bg-white/20 rounded-full">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            <div>
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2">Recent Chats</p>
                                <div className="space-y-1">
                                    {chats.map((chat: any) => (
                                        <button
                                            key={chat._id}
                                            onClick={() => { navigate('/chat', { state: { chat } }); setMobileHistoryOpen(false); }}
                                            className="w-full text-left px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50 rounded-xl truncate transition-colors"
                                        >
                                            {chat.title || "Untitled Chat"}
                                        </button>
                                    ))}
                                    {chats.length === 0 && <p className="text-xs text-gray-400 px-3">No recent chats</p>}
                                </div>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2">Deep Analyses</p>
                                <div className="space-y-1">
                                    {analyses.map((analysis: any) => (
                                        <button
                                            key={analysis._id}
                                            onClick={() => { navigate('/dashboard', { state: { analysis } }); setMobileHistoryOpen(false); }}
                                            className="w-full text-left px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50 rounded-xl truncate transition-colors"
                                        >
                                            {analysis.location} - {new Date(analysis.created_at).toLocaleDateString()}
                                        </button>
                                    ))}
                                    {analyses.length === 0 && <p className="text-xs text-gray-400 px-3">No analyses yet</p>}
                                </div>
                            </div>
                        </div>
                        <div className="p-4 border-t border-gray-100">
                            <button
                                onClick={() => { handleLogout(); setMobileHistoryOpen(false); }}
                                className="flex items-center gap-3 px-4 py-2.5 w-full text-left text-red-600 hover:bg-red-50 rounded-xl transition-colors text-sm font-medium"
                            >
                                <LogOut className="w-4 h-4" />
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto pt-14 pb-20 md:pt-0 md:pb-0 scroll-smooth">
                <Outlet context={{ refreshHistory: fetchHistory }} />
            </main>

            {/* Mobile Bottom Nav */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-200 z-50 safe-bottom">
                <div className="flex justify-around items-center px-1 py-2">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <NavLink
                                key={item.label}
                                to={item.path}
                                state={item.state}
                                className="flex flex-col items-center gap-1 px-2 py-2 rounded-xl transition-all duration-200 touch-active relative"
                            >
                                <div className={`p-1.5 rounded-xl transition-all duration-200 ${isActive
                                    ? 'bg-emerald-100 text-emerald-600'
                                    : 'text-gray-400'
                                    }`}>
                                    <item.icon className="w-5 h-5" />
                                </div>
                                <span className={`text-[10px] font-medium ${isActive ? 'text-emerald-600' : 'text-gray-400'}`}>
                                    {item.label}
                                </span>
                            </NavLink>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
};

export default Layout;
