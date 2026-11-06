import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';

@Component({
  selector: 'app-fare-info',
  templateUrl: './fare-info.page.html',
  styleUrls: ['./fare-info.page.scss'],
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule],
})
export class FareInfoPage implements OnInit {
  constructor() {}

  ngOnInit() {}
}
