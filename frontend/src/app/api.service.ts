import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  CatalogItem,
  DiyGuide,
  NearbyPlace,
  RecycleResult,
  ScanResult,
  Stats,
  ReuseResult
} from './models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly apiUrl = '/api';

  constructor(
    private readonly http: HttpClient
  ) {}

  scan(image: string) {
    return this.http.post<ScanResult>(
      `${this.apiUrl}/scan`,
      { image }
    );
  }

  confirmIdentification(itemId: string) {
    return this.http.post<ScanResult>(
      `${this.apiUrl}/scan/${encodeURIComponent(itemId)}/confirm`,
      {}
    );
  }

  correctItemName(itemId: string, name: string) {
    return this.http.put<{
      success: boolean;
      name: string;
      identificationConfirmed?: boolean;
    }>(
      `${this.apiUrl}/scan/${encodeURIComponent(itemId)}/correct`,
      { name }
    );
  }

  recycling(itemId: string) {
    return this.http.post<ScanResult>(
      `${this.apiUrl}/recycling/${encodeURIComponent(itemId)}`,
      {}
    );
  }

  catalog() {
    return this.http.get<CatalogItem[]>(
      `${this.apiUrl}/catalog`
    );
  }

  recycle(itemId: string, quantity: number) {
    return this.http.post<RecycleResult>(
      `${this.apiUrl}/recycle`,
      { itemId, quantity, userId: 'local-user' }
    );
  }

  stats() {
    return this.http.get<Stats>(
      `${this.apiUrl}/stats`,
      { params: { userId: 'local-user' } }
    );
  }

  diy(material: string, difficulty: string) {
    return this.http.get<DiyGuide[]>(
      `${this.apiUrl}/diy`,
      { params: { material, difficulty } }
    );
  }

  diyById(id: string) {
    return this.http.get<DiyGuide>(
      `${this.apiUrl}/diy/${id}`
    );
  }

  reuse(
    itemId: string,
    name: string,
    brand: string,
    size: string,
    container: string,
    material: string,
    difficulty: string
  ) {
    return this.http.post<ReuseResult>(
      `${this.apiUrl}/reuse`,
      {
        itemId,
        name,
        brand,
        size,
        container,
        material,
        difficulty
      }
    );
  }

  nearbyRecycling(lat: number, lng: number, material: string) {
    return this.http.get<NearbyPlace[]>(
      `${this.apiUrl}/places/recycling`,
      { params: { lat: lat.toString(), lng: lng.toString(), material } }
    );
  }
}