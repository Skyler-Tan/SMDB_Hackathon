import { Routes } from '@angular/router';
import { ScanPage } from './pages/scan.page';
import { ReusePage } from './pages/reuse.page';
import { DiyDetailPage } from './pages/diy-detail.page';
import { ImpactPage } from './pages/impact.page';

export const routes: Routes = [
  { path: '', component: ScanPage },
  { path: 'reuse', component: ReusePage },
  { path: 'reuse/:id', component: DiyDetailPage },
  { path: 'impact', component: ImpactPage },
  { path: '**', redirectTo: '' }
];
