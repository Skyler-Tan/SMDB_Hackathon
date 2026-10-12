import { AfterViewInit, Component } from '@angular/core';
import * as L from 'leaflet';

@Component({
  selector: 'app-recycling-map',
  standalone: true,
  templateUrl: './recycling-map.component.html',
  styleUrl: './recycling-map.component.css'
})
export class RecyclingMapComponent implements AfterViewInit {
  ngAfterViewInit(): void {
    const map = L.map('map').setView([4.5975, 101.0901], 12);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    const centres = [
      {
        name: 'Example Recycling Centre',
        lat: 4.5975,
        lng: 101.0901
      }
    ];

    centres.forEach(centre => {
      L.marker([centre.lat, centre.lng])
        .addTo(map)
        .bindPopup(centre.name);
    });
  }
}