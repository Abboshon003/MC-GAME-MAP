import type { Place } from '@/nav/types';

/**
 * Starter saved places (local, editable later). Real coordinates so live
 * routing works out of the box — replace via the Saved Places screen.
 */
export const savedPlaces: Place[] = [
  {
    id: 'saved-home',
    name: 'Home Base',
    detail: 'Ferry Building, San Francisco',
    location: { lat: 37.7955, lon: -122.3937 },
    category: 'home',
  },
  {
    id: 'saved-work',
    name: 'The Forge (Work)',
    detail: 'Salesforce Tower, San Francisco',
    location: { lat: 37.7897, lon: -122.3972 },
    category: 'work',
  },
  {
    id: 'saved-food',
    name: 'Bread Market',
    detail: 'Tartine Bakery, San Francisco',
    location: { lat: 37.7614, lon: -122.4241 },
    category: 'food',
  },
  {
    id: 'saved-gas',
    name: 'Fuel Bucket Stop',
    detail: 'Fuel station, Mission District',
    location: { lat: 37.7599, lon: -122.4148 },
    category: 'gas',
  },
  {
    id: 'saved-parking',
    name: 'Cart Signpost',
    detail: 'Parking, Golden Gate Park',
    location: { lat: 37.7694, lon: -122.4762 },
    category: 'parking',
  },
];

/** Offline map regions shown on the Downloads screen (demo data). */
export interface OfflineRegion {
  id: string;
  name: string;
  sizeLabel: string;
  /** 0..1 downloaded */
  progress: number;
}

export const offlineRegions: OfflineRegion[] = [
  { id: 'r1', name: 'San Francisco', sizeLabel: '184 MB', progress: 1 },
  { id: 'r2', name: 'East Bay', sizeLabel: '242 MB', progress: 0.62 },
  { id: 'r3', name: 'South Bay', sizeLabel: '198 MB', progress: 0.18 },
];
