import React, { createContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as authApi from '../Api/authApi';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(() => localStorage.getItem('token') || null);
    const [user, setUser] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            setUser({
            email: payload.email,
            userId: payload.userId,
            nombre: payload.nombre,
            apellidos: payload.apellidos,
            });
        } catch {
            setUser(null);
        }
        } else {
        setUser(null);
        }
    }, [token]);

    const saveToken = (newToken) => {
        if (newToken) {
        localStorage.setItem('token', newToken);
        setToken(newToken);
        }
    };

    const register = async (data) => {
        const res = await authApi.register(data);
        if (res && res.token) {
        saveToken(res.token);
        }
        return res;
    };

    const login = async (data) => {
        const res = await authApi.login(data);
        if (res && res.token) {
        saveToken(res.token);
        }
        return res;
    };

    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
        navigate('/login');
    };

    const isAuthenticated = () => {
        if (!token) return false;
        try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload && payload.exp) {
            const now = Math.floor(Date.now() / 1000);
            return payload.exp > now;
        }
        return true;
        } catch {
        return false;
        }
    };

    return (
        <AuthContext.Provider value={{ token, user, register, login, logout, isAuthenticated }}>
        {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
