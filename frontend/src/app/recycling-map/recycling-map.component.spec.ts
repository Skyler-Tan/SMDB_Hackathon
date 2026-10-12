import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { RecyclingMapComponent } from './recycling-map.component';
import { ApiService } from '../api.service';

describe('RecyclingMapComponent', () => {
  let component: RecyclingMapComponent;
  let fixture: ComponentFixture<RecyclingMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecyclingMapComponent],
      providers: [
        {
          provide: ApiService,
          useValue: {
            recyclingCentres: () => of([])
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RecyclingMapComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});