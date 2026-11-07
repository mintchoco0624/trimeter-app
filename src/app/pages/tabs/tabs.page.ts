import { Component, computed, inject } from '@angular/core';
import { IonIcon, IonLabel, IonTabBar, IonTabButton, IonTabs } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { informationCircle, personCircle, receipt, speedometer } from 'ionicons/icons';

import { SettingsService } from '../../services/settings';

/** Bottom navigation: Meter, History (drivers: Trips), Fare Info and Account, like the proposal's prototype. */
@Component({
  selector: 'app-tabs',
  templateUrl: './tabs.page.html',
  styleUrls: ['./tabs.page.scss'],
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
})
export class TabsPage {
  private settings = inject(SettingsService);
  readonly historyLabel = computed(() => (this.settings.role() === 'driver' ? 'Trips' : 'History'));

  constructor() {
    addIcons({ speedometer, receipt, informationCircle, personCircle });
  }
}
