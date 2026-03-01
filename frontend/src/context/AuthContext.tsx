import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import api from '../lib/api';

interface Agent {
    id: string;
    name: string;
    lastName: string;
    email: string;
    phone: string;
    role: string;
    points: number;
    verified?: boolean;
    avatarUrl?: string | null;
    identityFront?: string | null;
    identityBack?: string | null;
    emailVerified?: boolean;
    agencyId?: string | null;
    agency?: { id: string; name: string } | null;
    wallet?: { balance: number };
    _count?: { properties: number; transactions: number };
}

interface AuthContextType {
    agent: Agent | null;
    token: string | null;
    login: (email: string, password: string) => Promise<void>;
    register: (data: any) => Promise<void>;
    logout: () => void;
    refreshAgent: () => Promise<void>;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [agent, setAgent] = useState<Agent | null>(null);
    const [token, setToken] = useState<string | null>(localStorage.getItem('reky_token'));
    const [loading, setLoading] = useState(true);

    const fetchMe = useCallback(async () => {
        try {
            const r = await api.get('/auth/me');
            setAgent(r.data);
        } catch {
            setToken(null);
            localStorage.removeItem('reky_token');
        }
    }, []);

    useEffect(() => {
        if (token) {
            fetchMe().finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, [token, fetchMe]);

    const login = async (email: string, password: string) => {
        const r = await api.post('/auth/login', { email, password });
        localStorage.setItem('reky_token', r.data.token);
        setToken(r.data.token);
        setAgent(r.data.agent);
    };

    const register = async (data: any) => {
        const r = await api.post('/auth/register', data);
        localStorage.setItem('reky_token', r.data.token);
        setToken(r.data.token);
        setAgent(r.data.agent);
    };

    const logout = () => {
        localStorage.removeItem('reky_token');
        setToken(null);
        setAgent(null);
    };

    const refreshAgent = async () => {
        await fetchMe();
    };

    return (
        <AuthContext.Provider value={{ agent, token, login, register, logout, refreshAgent, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
};
