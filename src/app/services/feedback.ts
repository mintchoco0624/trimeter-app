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

  async error(message: string, header = 'Something went wrong'): Promise<void> {
    void this.haptic(() => Haptics.notification({ type: NotificationType.Error }));
    const alert = await this.alertCtrl.create({ header, message, buttons: ['OK'] });
    await alert.present();
    await alert.onDidDismiss();
  }

  /** Shows a cancel / confirm dialog and resolves to true when the user confirms. */
  async confirm(
    header: string,
    message: string,
    confirmText = 'OK',
    destructive = false,
    cancelText = 'Cancel',
  ): Promise<boolean> {
    const alert = await this.alertCtrl.create({
      header,
      message,
      // An accidental tap outside the dialog must not count as an answer (e.g. discarding a trip).
      backdropDismiss: false,
      buttons: [
        { text: cancelText, role: 'cancel' },
        { text: confirmText, role: destructive ? 'destructive' : 'confirm' },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    return role === 'confirm' || role === 'destructive';
  }

  /**
   * Explains why TriMeter needs location before Android shows its permission prompt.
   * Resolves to false when the user chooses "Not now".
   */
  explainLocation(): Promise<boolean> {
    return this.confirm(
      'Allow location?',
      'TriMeter uses GPS to measure how far the tricycle travels, so it can compute the fare. ' +
        'Location is used only while a trip is running or when you tap "Locate me", and it stays on this phone.',
      'Continue',
    );
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
