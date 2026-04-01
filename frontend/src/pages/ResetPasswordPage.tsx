import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Loader2, Eye, EyeOff, CheckCircle } from 'lucide-react';
import api from '../lib/api';

const ResetPasswordPage = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    if (!token) {
        return (
            <div className="min-h-screen bg-bg-dark flex items-center justify-center p-6">
                <div className="glass-card p-8 max-w-md w-full text-center">
                    <h2 className="text-xl font-bold text-red-400 mb-2">Enlace inválido</h2>
                    <p className="text-gray-400 mb-6">El enlace no es válido o está incompleto.</p>
                    <Link to="/auth" className="btn-primary inline-block w-full">Ir al inicio</Link>
                </div>
            </div>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres');
            return;
        }
        if (password !== confirm) {
            setError('Las contraseñas no coinciden');
            return;
        }

        setLoading(true);
        try {
            await api.post('/auth/reset-password', { token, password });
            setSuccess(true);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Hubo un error al restablecer tu contraseña. El enlace puede haber expirado.');
        } finally {
            setLoading(false);
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
                {success ? (
                    <div className="text-center">
                        <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle className="text-green-500 w-8 h-8" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">¡Contraseña restablecida!</h2>
                        <p className="text-gray-400 mb-8">Tu contraseña ha sido actualizada correctamente.</p>
                        <Link to="/auth" className="btn-primary block w-full">Iniciar Sesión</Link>
                    </div>
                ) : (
                    <>
                        <div className="text-center mb-8">
                            <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-glass-border">
                                <Lock className="text-accent-orange" size={24} />
                            </div>
                            <h2 className="text-2xl font-bold">Crea tu nueva contraseña</h2>
                            <p className="text-sm text-gray-400 mt-2">Ingresa tu nueva contraseña a continuación.</p>
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-3 rounded-xl mb-4 text-center">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                            <div className="relative">
                                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                                <input
                                    type={showPass ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Nueva contraseña"
                                    required
                                    className="w-full bg-white/5 border border-glass-border pl-11 pr-12 py-3.5 rounded-xl focus:outline-none focus:border-accent-orange transition-all placeholder:text-gray-600"
                                />
                                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors">
                                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            <div className="relative">
                                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                                <input
                                    type={showPass ? 'text' : 'password'}
                                    value={confirm}
                                    onChange={(e) => setConfirm(e.target.value)}
                                    placeholder="Confirmar contraseña"
                                    required
                                    className="w-full bg-white/5 border border-glass-border pl-11 pr-12 py-3.5 rounded-xl focus:outline-none focus:border-accent-orange transition-all placeholder:text-gray-600"
                                />
                            </div>

                            <button type="submit" disabled={loading} className="btn-primary mt-4">
                                {loading ? <Loader2 size={18} className="animate-spin" /> : 'Guardar contraseña'}
                            </button>
                        </form>
                    </>
                )}
            </motion.div>
        </div>
    );
};

export default ResetPasswordPage;
