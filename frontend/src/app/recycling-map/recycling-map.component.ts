import {
  AfterViewInit,
  Component,
  OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import * as L from 'leaflet';
import { ApiService } from '../api.service';

interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements: OverpassElement[];
}

interface RecyclingPlace {
  id: string;
  name: string;
  lat: number;
  lon: number;
  address: string;
  materials: string[];
  openingHours: string;
  phone: string;
  website: string;
  distanceKm: number;
  tags: Record<string, string>;
}

@Component({
  selector: 'app-recycling-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './recycling-map.component.html',
  styleUrl: './recycling-map.component.css'
})
export class RecyclingMapComponent implements AfterViewInit, OnDestroy {
  private map?: L.Map;
  private readonly markers = L.layerGroup();
  private locationMarker?: L.CircleMarker;
  currentLat?: number;
  currentLon?: number;
  private requestedMaterial = '';
  private itemId = '';
  private quantity = 1;
  private hasLoadedForLocation = false;

  itemName = '';
  materialLabel = 'your scanned material';
  places: RecyclingPlace[] = [];
  status = 'Requesting your location…';
  loading = false;
  locationError = '';
  loggedMessage = '';
  logging = false;

  private readonly overpassUrl = 'https://overpass-api.de/api/interpreter';
  private readonly searchRadiusMetres = 15000;

  constructor(
    private readonly http: HttpClient,
    private readonly route: ActivatedRoute,
    private readonly api: ApiService
  ) {
    const params = this.route.snapshot.queryParamMap;
    this.requestedMaterial = params.get('material') || '';
    this.materialLabel = this.requestedMaterial.trim() || 'your scanned material';
    this.itemName = params.get('itemName') || '';
    this.itemId = params.get('itemId') || '';
    const parsedQuantity = Number(params.get('quantity') || 1);
    this.quantity = Number.isFinite(parsedQuantity) && parsedQuantity >= 1
      ? Math.floor(parsedQuantity)
      : 1;
  }

  ngAfterViewInit(): void {
    this.map = L.map('recycling-map', { zoomControl: true })
      .setView([4.2105, 101.9758], 6);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    this.markers.addTo(this.map);
    this.useMyLocation();
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  useMyLocation(): void {
    this.locationError = '';
    if (!navigator.geolocation) {
      this.locationError = 'This browser does not support location. Open the app over HTTPS and try again.';
      this.status = this.locationError;
      return;
    }

    this.status = 'Finding your current location…';
    navigator.geolocation.getCurrentPosition(
      position => {
        this.currentLat = position.coords.latitude;
        this.currentLon = position.coords.longitude;
        this.map?.setView([this.currentLat, this.currentLon], 13);

        if (this.map) {
          if (this.locationMarker) this.map.removeLayer(this.locationMarker);
          this.locationMarker = L.circleMarker([this.currentLat, this.currentLon], {
            radius: 9,
            color: '#ffffff',
            weight: 3,
            fillColor: '#2583ff',
            fillOpacity: 1
          }).bindPopup('Your current location').addTo(this.map);
        }

        this.searchNearby();
      },
      error => {
        console.warn('Geolocation error:', error);
        const messages: Record<number, string> = {
          1: 'Location permission was denied. Allow location access in your browser settings, then tap Try again.',
          2: 'Your location could not be determined. Check your phone GPS or network and try again.',
          3: 'Finding your location took too long. Please try again.'
        };
        this.locationError = messages[error.code] || 'Could not get your location. Try again.';
        this.status = this.locationError;
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  }

  searchNearby(): void {
    if (this.currentLat == null || this.currentLon == null) {
      this.status = 'Get your location before searching nearby.';
      return;
    }

    this.loading = true;
    this.loggedMessage = '';
    this.status = `Searching for places that accept ${this.materialLabel}…`;

    // Query mapped recycling facilities, then include only facilities whose OSM tags
    // explicitly indicate acceptance of the scanned material.
    const lat = this.currentLat;
    const lon = this.currentLon;
    const query = `[out:json][timeout:25];(node["amenity"="recycling"](around:${this.searchRadiusMetres},${lat},${lon});way["amenity"="recycling"](around:${this.searchRadiusMetres},${lat},${lon});relation["amenity"="recycling"](around:${this.searchRadiusMetres},${lat},${lon}););out center tags;`;
    const params = new HttpParams().set('data', query);

    this.http.get<OverpassResponse>(this.overpassUrl, { params }).subscribe({
      next: response => {
        const materialKeys = this.getMaterialKeys(this.requestedMaterial, this.itemName);
        const results: RecyclingPlace[] = [];

        for (const element of response.elements || []) {
          const tags = element.tags || {};
          const acceptedKeys = materialKeys.filter(key => this.isAccepted(tags[key]));
          // Do not claim a facility accepts the material unless its map data says so.
          if (!acceptedKeys.length) continue;

          const point = element.type === 'node'
            ? { lat: element.lat, lon: element.lon }
            : element.center;
          if (!point || point.lat == null || point.lon == null) continue;

          const distance = this.distanceKm(lat, lon, point.lat, point.lon);
          if (distance > this.searchRadiusMetres / 1000) continue;

          results.push({
            id: `${element.type}-${element.id}`,
            name: tags['name'] || tags['operator'] || 'Recycling facility',
            lat: point.lat,
            lon: point.lon,
            address: this.formatAddress(tags),
            materials: acceptedKeys.map(key => this.materialNameForKey(key)),
            openingHours: tags['opening_hours'] || '',
            phone: tags['phone'] || tags['contact:phone'] || '',
            website: tags['website'] || tags['contact:website'] || '',
            distanceKm: distance,
            tags
          });
        }

        this.places = results.sort((a, b) => a.distanceKm - b.distanceKm);
        this.renderPlaces();
        this.loading = false;
        this.status = this.places.length
          ? `${this.places.length} mapped place(s) explicitly list acceptance of ${this.materialLabel}, within 15 km. Details depend on OpenStreetMap data.`
          : `No nearby facility was found with mapped acceptance for ${this.materialLabel}. This does not prove none exist; many facilities have incomplete material tags.`;
      },
      error: error => {
        console.error('Recycling place lookup failed:', error);
        this.loading = false;
        this.status = 'Could not retrieve live map data. Please try again in a moment.';
      }
    });
  }

  private renderPlaces(): void {
    if (!this.map) return;
    this.markers.clearLayers();

    for (const place of this.places) {
      const marker = L.circleMarker([place.lat, place.lon], {
        radius: 8,
        color: '#ffffff',
        weight: 2,
        fillColor: '#16864a',
        fillOpacity: 1
      });
      marker.bindPopup(this.createPopup(place));
      marker.addTo(this.markers);
    }
  }

  private createPopup(place: RecyclingPlace): HTMLElement {
    const root = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = place.name;
    root.appendChild(title);

    const address = document.createElement('p');
    address.textContent = place.address;
    root.appendChild(address);

    const accepted = document.createElement('p');
    accepted.textContent = `Mapped as accepting: ${place.materials.join(', ')}`;
    root.appendChild(accepted);

    const distance = document.createElement('p');
    distance.textContent = `${place.distanceKm.toFixed(1)} km away (straight-line distance)`;
    root.appendChild(distance);

    if (place.openingHours) {
      const hours = document.createElement('p');
      hours.textContent = `Opening hours (mapped): ${place.openingHours}`;
      root.appendChild(hours);
    }
    if (place.phone) {
      const phone = document.createElement('p');
      phone.textContent = `Phone: ${place.phone}`;
      root.appendChild(phone);
    }
    if (place.website) {
      const website = document.createElement('a');
      website.textContent = 'Website';
      website.href = place.website.startsWith('http') ? place.website : `https://${place.website}`;
      website.target = '_blank';
      website.rel = 'noopener noreferrer';
      root.appendChild(website);
      root.appendChild(document.createTextNode(' · '));
    }

    const directions = document.createElement('a');
    directions.textContent = 'Get directions';
    directions.href = `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lon}`;
    directions.target = '_blank';
    directions.rel = 'noopener noreferrer';
    root.appendChild(directions);
    return root;
  }

  private getMaterialKeys(material: string, itemName: string): string[] {
    const text = `${material} ${itemName}`.toLowerCase();
    if (/e[- ]?waste|electronic|electrical|computer|phone|laptop|charger/.test(text)) {
      return ['recycling:electrical_appliances', 'recycling:small_electrical_appliances', 'recycling:electronics', 'recycling:e_waste'];
    }
    if (/battery|batteries/.test(text)) return ['recycling:batteries'];
    if (/plastic|pet|hdpe|pvc|polypropylene/.test(text)) return ['recycling:plastic', 'recycling:plastic_bottles'];
    if (/paper|cardboard|carton/.test(text)) return ['recycling:paper', 'recycling:cardboard', 'recycling:cartons'];
    if (/glass/.test(text)) return ['recycling:glass', 'recycling:glass_bottles'];
    if (/alumin|metal|steel|tin|can/.test(text)) return ['recycling:metal', 'recycling:aluminium', 'recycling:cans'];
    if (/textile|clothes|fabric|clothing/.test(text)) return ['recycling:clothes', 'recycling:textiles'];
    if (/organic|food|compost/.test(text)) return ['recycling:green_waste', 'recycling:organic'];
    return [];
  }

  private isAccepted(value?: string): boolean {
    if (!value) return false;
    return ['yes', 'designated', 'container', 'drop-off', 'collection', 'recycling', 'deposit'].includes(value.toLowerCase());
  }

  private materialNameForKey(key: string): string {
    return key.replace(/^recycling:/, '').replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
  }

  private formatAddress(tags: Record<string, string>): string {
    const parts = [tags['addr:housenumber'], tags['addr:street'], tags['addr:suburb'], tags['addr:city'], tags['addr:postcode']].filter(Boolean);
    return parts.join(', ') || tags['addr:full'] || 'Address not recorded in OpenStreetMap';
  }

  private distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const radians = (value: number) => value * Math.PI / 180;
    const dLat = radians(lat2 - lat1);
    const dLon = radians(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLon / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  confirmRecycled(): void {
    if (!this.itemId || this.logging) return;
    this.logging = true;
    this.loggedMessage = '';
    this.api.recycle(this.itemId, this.quantity).subscribe({
      next: response => {
        this.logging = false;
        this.loggedMessage = `Recycling recorded! +${response.pointsThisTurn} points earned.`;
      },
      error: error => {
        console.error('Could not record recycling:', error);
        this.logging = false;
        this.loggedMessage = error?.error?.message || 'Could not record recycling. Please try again.';
      }
    });
  }
}
