interface NotificationOptions {
  message: string;
  duration?: number;
  type?: 'success' | 'error' | 'info';
}

class NotificationService {
  private createNotificationElement(options: NotificationOptions): HTMLDivElement {
    const notification = document.createElement('div');
    
    // Style dla kontenera
    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 16px 24px;
      border-radius: 8px;
      font-family: "Open Sans", Arial, sans-serif;
      font-size: 14px;
      font-weight: 500;
      z-index: 999999;
      opacity: 0;
      transform: translateX(100%);
      transition: all 0.3s ease;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      max-width: 400px;
      word-wrap: break-word;
    `;

    // Kolory w zależności od typu
    switch (options.type) {
      case 'error':
        notification.style.background = '#ff4444';
        notification.style.color = 'white';
        break;
      case 'success':
        notification.style.background = '#00C851';
        notification.style.color = 'white';
        break;
      default:
        notification.style.background = '#33b5e5';
        notification.style.color = 'white';
    }

    notification.textContent = options.message;
    return notification;
  }

  show(options: NotificationOptions): void {
    const notification = this.createNotificationElement(options);
    document.body.appendChild(notification);

    // Animacja wejścia
    setTimeout(() => {
      notification.style.opacity = '1';
      notification.style.transform = 'translateX(0)';
    }, 100);

    // Animacja wyjścia
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(100%)';
      
      // Usuń element po animacji
      setTimeout(() => {
        notification.remove();
      }, 300);
    }, options.duration || 10000);
  }

  // Metody pomocnicze
  success(message: string, duration?: number): void {
    this.show({ message, type: 'success', duration });
  }

  error(message: string, duration?: number): void {
    this.show({ message, type: 'error', duration });
  }

  info(message: string, duration?: number): void {
    this.show({ message, type: 'info', duration });
  }
}

export const notificationService = new NotificationService(); 