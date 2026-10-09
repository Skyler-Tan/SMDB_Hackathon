import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import {
  CatalogItem,
  DiyGuide,
  RecycleResult,
  ScanResult,
  Stats,
  ReuseResult
} from './models';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  private readonly apiUrl =
    'http://localhost:8080/api';

  constructor(
    private readonly http: HttpClient
  ) {}

  scan(image: string) {
    return this.http.post<ScanResult>(
      `${this.apiUrl}/scan`,
      {
        image
      }
    );
  }

recycling(itemId: string) {
  return this.http.post<ScanResult>(
    `${this.apiUrl}/recycling/${itemId}`,
    {}
  );
}

  catalog() {
    return this.http.get<CatalogItem[]>(
      `${this.apiUrl}/catalog`
    );
  }
  

  recycle(
    itemId: string,
    quantity: number
  ) {
    return this.http.post<RecycleResult>(
      `${this.apiUrl}/recycle`,
      {
        itemId,
        quantity,
        userId: 'local-user'
      }
    );
  }

  stats() {
    return this.http.get<Stats>(
      `${this.apiUrl}/stats`,
      {
        params: {
          userId: 'local-user'
        }
      }
    );
  }

  diy(
    material: string,
    difficulty: string
  ) {
    return this.http.get<DiyGuide[]>(
      `${this.apiUrl}/diy`,
      {
        params: {
          material,
          difficulty
        }
      }
    );
  }

  diyById(id: string) {
    return this.http.get<DiyGuide>(
      `${this.apiUrl}/diy/${id}`
    );
  }

  reuse(
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
        name,
        brand,
        size,
        container,
        material,
        difficulty
      }
    );
  }
}