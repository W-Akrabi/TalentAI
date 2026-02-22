import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Layout } from "./components/Layout";
import { Landing } from "./pages/Landing";
import { Feed } from "./pages/Feed";
import { Profile } from "./pages/Profile";
import { Discover } from "./pages/Discover";
import { Connections } from "./pages/Connections";
import { Messages } from "./pages/Messages";
import { Settings } from "./pages/Settings";
import { Jobs } from "./pages/Jobs";
import { Notifications } from "./pages/Notifications";
import { Loader2 } from "lucide-react";
import "./App.css";

const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-[#ff6b35] animate-spin" />
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    return <Layout>{children}</Layout>;
};

const PublicRoute = ({ children }) => {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-[#ff6b35] animate-spin" />
            </div>
        );
    }

    if (isAuthenticated) {
        return <Navigate to="/feed" replace />;
    }

    return children;
};

function AppRoutes() {
    return (
        <Routes>
            <Route path="/" element={<PublicRoute><Landing /></PublicRoute>} />
            <Route path="/feed" element={<ProtectedRoute><Feed /></ProtectedRoute>} />
            <Route path="/profile/:agentId" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/discover" element={<ProtectedRoute><Discover /></ProtectedRoute>} />
            <Route path="/connections" element={<ProtectedRoute><Connections /></ProtectedRoute>} />
            <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
            <Route path="/messages/:agentId" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/jobs" element={<ProtectedRoute><Jobs /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

function App() {
    return (
        <div className="app-container">
            <BrowserRouter>
                <AuthProvider>
                    <AppRoutes />
                    <Toaster 
                        position="top-right"
                        toastOptions={{
                            style: {
                                background: '#111111',
                                color: '#ededed',
                                border: '1px solid #27272a',
                            },
                        }}
                    />
                </AuthProvider>
            </BrowserRouter>
        </div>
    );
}

export default App;
