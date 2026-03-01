import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, Phone, Building2, Loader2, Eye, EyeOff, Users, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';

type Mode = 'login' | 'register';

interface LoginForm { email: string; password: string; }
interface RegisterForm {
    name: string; lastName: string; email: string;
    password: string; phone: string; role: 'agente' | 'agencia';
    agencyId?: string;
}

type AgentType = 'independiente' | 'de_agencia' | 'agencia';

const AuthPage = () => {
    const [mode, setMode] = useState<Mode>('login');
    const [showPass, setShowPass] = useState(false);
    const [error, setError] = useState('');
    const { login, register: registerFn } = useAuth();
    const navigate = useNavigate();

    const loginForm = useForm<LoginForm>();
    const registerForm = useForm<RegisterForm>({ defaultValues: { role: 'agente' } });

    const [agentType, setAgentType] = useState<AgentType>('independiente');
    const [agencies, setAgencies] = useState<{ id: string; name: string }[]>([]);

    // Fetch agencies for the dropdown
    useEffect(() => {
        api.get('/agencies').then(r => setAgencies(r.data)).catch(() => { });
    }, []);

    const handleLogin = async (data: LoginForm) => {
        setError('');
        try {
            await login(data.email, data.password);
            navigate('/search');
        } catch (e: any) {
            setError(e.response?.data?.message || 'Error al iniciar sesión');
        }
    };

    const handleRegister = async (data: RegisterForm) => {
        setError('');
        try {
            // Set role based on agentType
            const payload: any = { ...data };
            if (agentType === 'agencia') {
                payload.role = 'agencia';
            } else {
                payload.role = 'agente';
            }
            // If de_agencia, include agencyId (backend will create the pending request)
            if (agentType === 'de_agencia' && data.agencyId) {
                payload.agencyId = data.agencyId;
            }
            await registerFn(payload);
            navigate('/search');
        } catch (e: any) {
            setError(e.response?.data?.message || 'Error al registrarse');
        }
    };

    return (
        <div className="min-h-screen bg-bg-dark flex items-center justify-center p-6 relative overflow-hidden">
            {/* Ambient blobs */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-accent-orange/5 rounded-full blur-3xl -mt-32 pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-accent-blue/30 rounded-full blur-3xl pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-8 w-full max-w-md relative z-10"
            >
                {/* Logo */}
                <div className="flex justify-center mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-accent-orange rounded-2xl flex items-center justify-center text-3xl font-bold">R</div>
                        <div>
                            <h1 className="text-2xl font-bold">Reky AI</h1>
                            <p className="text-xs text-gray-500">Plataforma Inmobiliaria</p>
                        </div>
                    </div>
                </div>

                {/* Tab switcher */}
                <div className="flex bg-white/5 rounded-xl p-1 mb-8">
                    {(['login', 'register'] as Mode[]).map(m => (
                        <button
                            key={m}
                            onClick={() => { setMode(m); setError(''); }}
                            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${mode === m ? 'bg-accent-orange text-white shadow-lg shadow-accent-orange/20' : 'text-gray-500 hover:text-white'}`}
                        >
                            {m === 'login' ? 'Iniciar Sesión' : 'Registrarse'}
                        </button>
                    ))}
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-3 rounded-xl mb-4 text-center">
                        {error}
                    </div>
                )}

                <AnimatePresence mode="wait">
                    {mode === 'login' ? (
                        <motion.form
                            key="login"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            onSubmit={loginForm.handleSubmit(handleLogin)}
                            className="flex flex-col gap-4"
                        >
                            <div className="relative">
                                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                                <input
                                    {...loginForm.register('email', { required: true })}
                                    type="email"
                                    placeholder="correo@email.com"
                                    className="w-full bg-white/5 border border-glass-border pl-11 pr-4 py-3.5 rounded-xl focus:outline-none focus:border-accent-orange transition-all placeholder:text-gray-600"
                                />
                            </div>
                            <div className="relative">
                                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                                <input
                                    {...loginForm.register('password', { required: true })}
                                    type={showPass ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    className="w-full bg-white/5 border border-glass-border pl-11 pr-12 py-3.5 rounded-xl focus:outline-none focus:border-accent-orange transition-all placeholder:text-gray-600"
                                />
                                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors">
                                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            <button type="submit" disabled={loginForm.formState.isSubmitting} className="btn-primary mt-2">
                                {loginForm.formState.isSubmitting ? <Loader2 size={18} className="animate-spin" /> : 'Iniciar Sesión'}
                            </button>
                        </motion.form>
                    ) : (
                        <motion.form
                            key="register"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            onSubmit={registerForm.handleSubmit(handleRegister)}
                            className="flex flex-col gap-4"
                        >
                            <div className="grid grid-cols-2 gap-4">
                                <div className="relative">
                                    <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                                    <input
                                        {...registerForm.register('name', { required: true })}
                                        placeholder="Nombre"
                                        className="w-full bg-white/5 border border-glass-border pl-11 pr-4 py-3.5 rounded-xl focus:outline-none focus:border-accent-orange transition-all"
                                    />
                                </div>
                                <input
                                    {...registerForm.register('lastName', { required: true })}
                                    placeholder="Apellido"
                                    className="w-full bg-white/5 border border-glass-border px-4 py-3.5 rounded-xl focus:outline-none focus:border-accent-orange transition-all"
                                />
                            </div>
                            <div className="relative">
                                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                                <input
                                    {...registerForm.register('email', { required: true })}
                                    type="email"
                                    placeholder="correo@email.com"
                                    className="w-full bg-white/5 border border-glass-border pl-11 pr-4 py-3.5 rounded-xl focus:outline-none focus:border-accent-orange transition-all"
                                />
                            </div>
                            <div className="relative">
                                <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                                <input
                                    {...registerForm.register('phone', { required: true })}
                                    placeholder="+591 7X XXX XXX"
                                    className="w-full bg-white/5 border border-glass-border pl-11 pr-4 py-3.5 rounded-xl focus:outline-none focus:border-accent-orange transition-all"
                                />
                            </div>
                            <div className="relative">
                                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                                <input
                                    {...registerForm.register('password', { required: true, minLength: 6 })}
                                    type={showPass ? 'text' : 'password'}
                                    placeholder="Contraseña (min. 6 caracteres)"
                                    className="w-full bg-white/5 border border-glass-border pl-11 pr-12 py-3.5 rounded-xl focus:outline-none focus:border-accent-orange transition-all"
                                />
                                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors">
                                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 mb-2 flex items-center gap-2"><Building2 size={14} /> Tipo de cuenta</p>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { key: 'independiente' as const, label: 'Independiente', icon: User },
                                        { key: 'de_agencia' as const, label: 'De Agencia', icon: Users },
                                        { key: 'agencia' as const, label: 'Agencia', icon: Building2 },
                                    ].map(r => (
                                        <button key={r.key} type="button"
                                            onClick={() => setAgentType(r.key)}
                                            className={`flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl border transition-all text-xs ${agentType === r.key ? 'border-accent-orange bg-accent-orange/10 text-white' : 'border-glass-border text-gray-500 hover:border-gray-600'}`}>
                                            <r.icon size={16} />
                                            {r.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Agency selector (only shown for 'de_agencia') */}
                            <AnimatePresence>
                                {agentType === 'de_agencia' && (
                                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                        <div className="relative">
                                            <Building2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                                            <select
                                                {...registerForm.register('agencyId', { required: agentType === 'de_agencia' })}
                                                className="w-full bg-white/5 border border-glass-border pl-11 pr-10 py-3.5 rounded-xl focus:outline-none focus:border-accent-orange transition-all text-sm appearance-none text-white"
                                            >
                                                <option value="" className="bg-bg-dark">Seleccionar agencia...</option>
                                                {agencies.map(a => (
                                                    <option key={a.id} value={a.id} className="bg-bg-dark">{a.name}</option>
                                                ))}
                                            </select>
                                            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                                        </div>
                                        <p className="text-[10px] text-gray-500 mt-1.5 ml-1">La agencia deberá aprobar tu solicitud</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                            <button type="submit" disabled={registerForm.formState.isSubmitting} className="btn-primary mt-2">
                                {registerForm.formState.isSubmitting ? <Loader2 size={18} className="animate-spin" /> : 'Crear Cuenta'}
                            </button>
                        </motion.form>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};

export default AuthPage;
