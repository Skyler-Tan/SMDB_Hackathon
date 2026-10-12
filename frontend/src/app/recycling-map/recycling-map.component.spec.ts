import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { RecyclingMapComponent } from './recycling-map.component';
import { ApiService } from '../api.service';

describe('RecyclingMapComponent', () => {
  let component: RecyclingMapComponent;
  let fixture: ComponentFixture<RecyclingMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecyclingMapComponent, HttpClientTestingModule],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => null } } } },
        { provide: ApiService, useValue: { recycle: () => of({ pointsThisTurn: 0 }) } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RecyclingMapComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
