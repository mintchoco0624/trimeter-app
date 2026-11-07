import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  AlertController,
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  car,
  chatbubbles,
  create,
  helpCircle,
  idCard,
  location,
  logOut,
  lockClosed,
  pricetag,
  swapHorizontal,
  trash,
  walk,
} from 'ionicons/icons';

import { PASSENGER_LABELS } from '../../models/fare-matrix';
import { type AppRole, ROLE_LABELS } from '../../models/profile';
import { FeedbackService } from '../../services/feedback';
import { LocationService } from '../../services/location';
import { SettingsService } from '../../services/settings';
import { TripStorageService } from '../../services/trip-storage';

/**
 * The local profile: name, role, discount information, privacy, help and log out.
 * There is no server account, so nothing here leaves the phone.
 */
@Component({
  selector: 'app-account',
  templateUrl: './account.page.html',
  styleUrls: ['./account.page.scss'],
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonNote,
    IonIcon,
    IonButton,
    RouterLink,
  ],
})
export class AccountPage {
  private settings = inject(SettingsService);
  private storage = inject(TripStorageService);
  private location = inject(LocationService);
  private feedback = inject(FeedbackService);
  private alertCtrl = inject(AlertController);
  private router = inject(Router);

  readonly role = this.settings.role;
  readonly displayName = this.settings.displayName;
  readonly passengerType = this.settings.passengerType;
  readonly tripCount = computed(() => this.storage.trips().length);
  readonly roleLabels = ROLE_LABELS;
  readonly passengerLabels = PASSENGER_LABELS;
  readonly initial = computed(() =>
    (this.displayName().trim()[0] ?? (this.role() === 'driver' ? 'D' : 'C')).toUpperCase(),
  );
  readonly locationAllowed = signal<boolean | null>(null);

  constructor() {
    addIcons({
      create,
      swapHorizontal,
      idCard,
      location,
      lockClosed,
      helpCircle,
      chatbubbles,
      trash,
      logOut,
      car,
      walk,
      pricetag,
    });
  }

  async ionViewWillEnter(): Promise<void> {
    this.locationAllowed.set(await this.location.isGranted());
  }

  async editName(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Your name',
      message: 'Shown only on this phone.',
      inputs: [{ name: 'name', type: 'text', value: this.displayName(), attributes: { maxlength: 40 } }],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Save', role: 'confirm' },
      ],
    });
    await alert.present();
    const { role, data } = await alert.onDidDismiss<{ values: { name: string } }>();
    if (role !== 'confirm') return;
    await this.settings.setDisplayName(data?.values.name ?? '');
    await this.feedback.toast('Name saved.', 'success');
  }

  async switchRole(): Promise<void> {
    if (this.location.tracking()) {
      await this.feedback.toast('End the current trip before switching roles.', 'warning');
      return;
    }
    const next: AppRole = this.role() === 'driver' ? 'commuter' : 'driver';
    const ok = await this.feedback.confirm(
      `Switch to ${ROLE_LABELS[next]}?`,
      next === 'driver'
        ? 'The Meter will let you choose the passenger type for each trip, and History becomes your trip records.'
        : 'The Meter will let you search a destination for a fare preview and check for overcharging.',
      'Switch',
    );
    if (!ok) return;
    await this.settings.setRole(next);
    await this.feedback.toast(`You are now using TriMeter as a ${ROLE_LABELS[next].toLowerCase()}.`, 'success');
  }

  async deleteTrips(): Promise<void> {
    if (this.tripCount() === 0) {
      await this.feedback.toast('There are no saved trips.');
      return;
    }
    const ok = await this.feedback.confirm(
      'Delete all trips?',
      `This permanently deletes ${this.tripCount()} saved trip(s) from this phone.`,
      'Delete all',
      true,
    );
    if (!ok) return;
    await this.storage.clear();
    await this.feedback.toast('All trips deleted.');
  }

  async logout(): Promise<void> {
    if (this.location.tracking()) {
      await this.feedback.toast('End the current trip before logging out.', 'warning');
      return;
    }
    const ok = await this.feedback.confirm(
      'Log out?',
      'Your name, role and passenger type are cleared and the welcome screens show again. ' +
        'Saved trips stay on this phone (delete them separately if you want).',
      'Log out',
      true,
    );
    if (!ok) return;
    await this.settings.logout();
    await this.router.navigateByUrl('/onboarding', { replaceUrl: true });
  }
}
