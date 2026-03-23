import type { ReactNode } from 'react';
import { Search, Plus, MessageSquare, ClipboardList, User } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

interface LayoutProps {
    children: ReactNode;
}

const navItems = [
    { name: 'Buscar', icon: Search, path: '/search' },
    { name: 'Chat', icon: MessageSquare, path: '/chat' },
    { name: 'Publicar', icon: Plus, path: '/publish' },
    { name: 'Pedidos', icon: ClipboardList, path: '/requirements' },
    { name: 'Perfil', icon: User, path: '/profile' },
];

const Layout = ({ children }: LayoutProps) => {
    const location = useLocation();

    return (
        <div className="min-h-screen bg-bg-dark flex flex-col">

            {/* Main Content — padded bottom for navbar */}
            <main className="flex-1 pt-4 pb-28 overflow-hidden">
                <div className="h-full">
                    {children}
                </div>
            </main>

            {/* Bottom Navigation Bar */}
            <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm sm:max-w-md">
                <div
                    className="flex items-center justify-around px-2 py-2 rounded-2xl border border-glass-border backdrop-blur-2xl"
                    style={{
                        background: 'rgba(20, 20, 26, 0.85)',
                        boxShadow: '0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06) inset',
                    }}
                >
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        const isPublish = item.path === '/publish';

                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className="relative flex flex-col items-center gap-0.5 group"
                                style={{ minWidth: 56, padding: '4px 0' }}
                            >
                                {/* Publish button gets special floating treatment */}
                                {isPublish ? (
                                    <div className="w-12 h-12 -mt-6 rounded-2xl bg-accent-orange flex items-center justify-center shadow-lg shadow-accent-orange/40 border-4 border-bg-dark group-hover:scale-110 transition-transform duration-200">
                                        <Icon size={22} className="text-white" />
                                    </div>
                                ) : (
                                    <div className={`relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 ${isActive ? 'bg-accent-orange/15' : 'group-hover:bg-white/5'}`}>
                                        {isActive && (
                                            <motion.div
                                                layoutId="nav-indicator"
                                                className="absolute inset-0 rounded-xl bg-accent-orange/15"
                                                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                            />
                                        )}
                                        <Icon
                                            size={20}
                                            className={`relative z-10 transition-colors duration-200 ${isActive ? 'text-accent-orange' : 'text-gray-500 group-hover:text-gray-300'}`}
                                        />
                                    </div>
                                )}
                                {!isPublish && (
                                    <span className={`text-[10px] font-medium transition-colors duration-200 ${isActive ? 'text-accent-orange' : 'text-gray-600 group-hover:text-gray-400'}`}>
                                        {item.name}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
};

export default Layout;
