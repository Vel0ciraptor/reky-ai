import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function ReloadPrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r: ServiceWorkerRegistration | undefined) {
      console.log('SW Registered: ' + r);
    },
    onRegisterError(error: any) {
      console.log('SW registration error', error);
    },
  });

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  return (
    <AnimatePresence>
      {(offlineReady || needRefresh) && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-sm"
        >
          <div className="bg-bg-card border border-glass-border rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-4 backdrop-blur-xl">
            <div className="flex-1">
              <p className="text-sm font-bold text-white">
                {offlineReady ? 'Aplicación lista para usar sin conexión' : 'Nueva versión disponible'}
              </p>
              <p className="text-[10px] text-gray-500 mt-0.5">
                {needRefresh ? 'Actualiza para ver los últimos cambios.' : 'Accede a tus datos en cualquier momento.'}
              </p>
            </div>
            
            <div className="flex gap-2">
              {needRefresh && (
                <button
                  onClick={() => updateServiceWorker(true)}
                  className="bg-accent-orange text-white p-2.5 rounded-xl hover:bg-accent-orange-hover transition-colors shadow-lg shadow-accent-orange/20"
                >
                  <RefreshCw size={16} />
                </button>
              )}
              <button
                onClick={() => close()}
                className="bg-white/5 text-gray-400 p-2.5 rounded-xl hover:text-white transition-colors border border-glass-border"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default ReloadPrompt;
