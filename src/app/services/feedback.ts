import { Service, inject } from '@angular/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { AlertController, ToastController } from '@ionic/angular';

/**
 * One place for user feedback: toasts, confirm dialogs and haptics (Capacitor Haptics).
 * Haptics are best-effort: a phone without a vibration motor (or a browser) just skips them.
 */
@Service()
export class FeedbackService {
  private toastCtrl = inject(ToastController);
  private alertCtrl = inject(AlertController);

  async toast(message: string, color: 'success' | 'danger' | 'warning' | 'dark' = 'dark'): Promise<void> {
    const toast = await this.toastCtrl.create({ message, color, duration: 2500, position: 'top' });
    await toast.present();
  }

  async error(message: string): Promise<void> {
    void this.haptic(() => Haptics.notification({ type: NotificationType.Error }));
    const alert = await this.alertCtrl.create({ header: 'Something went wrong', message, buttons: ['OK'] });
    await alert.present();
  }

  /** Shows a Cancel / confirm dialog and resolves to true when the user confirms. */
  async confirm(header: string, message: string, confirmText = 'OK', destructive = false): Promise<boolean> {
    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: confirmText, role: destructive ? 'destructive' : 'confirm' },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    return role === 'confirm' || role === 'destructive';
  }

  /** Light tap: the fare went up. */
  tick(): Promise<void> {
    return this.haptic(() => Haptics.impact({ style: ImpactStyle.Light }));
  }

  /** Firm tap: trip started or stopped. */
  bump(): Promise<void> {
    return this.haptic(() => Haptics.impact({ style: ImpactStyle.Heavy }));
  }

  success(): Promise<void> {
    return this.haptic(() => Haptics.notification({ type: NotificationType.Success }));
  }

  private async haptic(fn: () => Promise<void>): Promise<void> {
    try {
      await fn();
    } catch {
      // no vibration available
    }
  }
}
