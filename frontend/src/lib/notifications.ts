/**
 * Utility service to handle PWA / Browser notifications
 */
export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications.');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
};

export const showNotification = (title: string, options?: NotificationOptions) => {
  if (Notification.permission === 'granted') {
    // Check if service worker is available for a better "PWA" experience
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification(title, {
          icon: '/pwa-512x512.png',
          badge: '/pwa-512x512.png',
          vibrate: [200, 100, 200],
          ...options,
        } as any);
      });
    } else {
      // Fallback to standard browser notification
      new Notification(title, options);
    }
  }
};
