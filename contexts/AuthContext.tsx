import React, { createContext, useState, useEffect, useContext } from 'react';

interface AuthContextType {
    session: any | null;
    user: any | null;
    loading: boolean;
    login: (password: string) => Promise<{ success: boolean; error?: string }>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    loading: true,
    login: async () => ({ success: false }),
    signOut: async () => { },
});

const SESSION_KEY = 'vc_local_auth_session';

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [session, setSession] = useState<any | null>(null);
    const [user, setUser] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Verificar se já existe uma sessão local salva
        const activeSession = localStorage.getItem(SESSION_KEY);
        if (activeSession === 'true') {
            const mockUser = { id: 'local-admin', email: 'admin@viacargo.com' };
            setSession({ user: mockUser });
            setUser(mockUser);
        }
        setLoading(false);
    }, []);

    const login = async (password: string) => {
        // Simular pequeno delay para suavidade da interface
        await new Promise(resolve => setTimeout(resolve, 400));

        const correctPassword = import.meta.env.VITE_ACCESS_PASSWORD;

        if (password === correctPassword) {
            const mockUser = { id: 'local-admin', email: 'admin@viacargo.com' };
            localStorage.setItem(SESSION_KEY, 'true');
            setSession({ user: mockUser });
            setUser(mockUser);
            return { success: true };
        }

        return { success: false, error: 'Senha incorreta. Tente novamente.' };
    };

    const signOut = async () => {
        localStorage.removeItem(SESSION_KEY);
        setSession(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ session, user, loading, login, signOut }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
