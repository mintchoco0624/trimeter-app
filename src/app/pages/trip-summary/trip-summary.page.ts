import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';

@Component({
  selector: 'app-trip-summary',
  templateUrl: './trip-summary.page.html',
  styleUrls: ['./trip-summary.page.scss'],
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule],
})
export class TripSummaryPage implements OnInit {
  constructor() {}

  ngOnInit() {}
}
