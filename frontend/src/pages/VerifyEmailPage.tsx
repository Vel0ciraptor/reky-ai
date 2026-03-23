import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import api from '../lib/api';

const VerifyEmailPage = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();

    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage('No se encontró un token válido. Por favor utiliza el enlace de tu correo.');
            return;
        }

        const verifyAccount = async () => {
            try {
                const res = await api.get(`/auth/verify-email?token=${token}`);
                setStatus('success');
                setMessage(res.data.message || 'Tu cuenta ha sido verificada correctamente.');
            } catch (err: any) {
                setStatus('error');
                setMessage(err.response?.data?.message || 'Error al validar tu cuenta. Es posible que el enlace ya haya sido usado o expiró.');
            }
        };

        verifyAccount();
    }, [token]);

    return (
        <div className="min-h-screen bg-bg-dark flex items-center justify-center p-6 relative overflow-hidden">
            {/* Ambient blobs */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-accent-orange/5 rounded-full blur-3xl -mt-32 pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-accent-blue/30 rounded-full blur-3xl pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-card p-10 max-w-md w-full relative z-10 flex flex-col items-center text-center"
            >
                {status === 'loading' && (
                    <div className="flex flex-col items-center">
                        <Loader2 size={48} className="animate-spin text-accent-orange mb-6" />
                        <h2 className="text-xl font-bold mb-2">Verificando tu cuenta</h2>
                        <p className="text-gray-400">Por favor espera un momento...</p>
                    </div>
                )}

                {status === 'success' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center">
                        <CheckCircle size={56} className="text-green-500 mb-6" />
                        <h2 className="text-2xl font-bold mb-3">¡Cuenta Activada!</h2>
                        <p className="text-gray-400 mb-8">{message}</p>
                        <button onClick={() => navigate('/auth')} className="btn-primary w-full">
                            Iniciar Sesión
                        </button>
                    </motion.div>
                )}

                {status === 'error' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center">
                        <XCircle size={56} className="text-red-500 mb-6" />
                        <h2 className="text-2xl font-bold mb-3">Ocurrió un error</h2>
                        <p className="text-gray-400 mb-8">{message}</p>
                        <button onClick={() => navigate('/auth')} className="w-full bg-white/5 border border-glass-border py-3.5 rounded-xl hover:bg-white/10 transition-all font-semibold">
                            Volver al inicio
                        </button>
                    </motion.div>
                )}
            </motion.div>
        </div>
    );
};

export default VerifyEmailPage;
