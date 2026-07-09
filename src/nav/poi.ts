import type { LatLng } from './types';

/** Business/point-of-interest categories we render with pixel icons. */
export type PoiCategory =
  | 'restaurant'
  | 'cafe'
  | 'fastfood'
  | 'bar'
  | 'grocery'
  | 'shop'
  | 'bank'
  | 'pharmacy'
  | 'hospital'
  | 'school'
  | 'hotel'
  | 'fuel'
  | 'worship'
  | 'gym'
  | 'park'
  | 'default';

export interface Poi {
  id: string;
  name: string;
  category: PoiCategory;
  location: LatLng;
}

/** OSM tags we care about, keyed loosely. */
export interface OsmTags {
  [k: string]: string | undefined;
}

/**
 * Map raw OSM tags → a display category. Order matters (most specific first).
 * Returns null for things that shouldn't appear as a business marker.
 */
export function classifyPoi(tags: OsmTags): PoiCategory | null {
  const amenity = tags.amenity;
  const shop = tags.shop;
  const tourism = tags.tourism;
  const leisure = tags.leisure;

  if (amenity) {
    switch (amenity) {
      case 'restaurant':
        return 'restaurant';
      case 'cafe':
      case 'ice_cream':
        return 'cafe';
      case 'fast_food':
        return 'fastfood';
      case 'bar':
      case 'pub':
      case 'biergarten':
        return 'bar';
      case 'bank':
      case 'atm':
      case 'bureau_de_change':
        return 'bank';
      case 'pharmacy':
        return 'pharmacy';
      case 'hospital':
      case 'clinic':
      case 'doctors':
        return 'hospital';
      case 'school':
      case 'university':
      case 'college':
      case 'library':
        return 'school';
      case 'fuel':
      case 'charging_station':
        return 'fuel';
      case 'place_of_worship':
        return 'worship';
    }
  }
  if (shop) {
    if (shop === 'supermarket' || shop === 'grocery' || shop === 'convenience' || shop === 'greengrocer')
      return 'grocery';
    return 'shop';
  }
  if (tourism === 'hotel' || tourism === 'motel' || tourism === 'hostel' || tourism === 'guest_house')
    return 'hotel';
  if (leisure === 'fitness_centre' || amenity === 'gym' || leisure === 'sports_centre') return 'gym';
  if (leisure === 'park' || leisure === 'garden') return 'park';
  return null;
}

/** Human label for a category (shown in the callout). */
export const CATEGORY_LABEL: Record<PoiCategory, string> = {
  restaurant: 'Restaurant',
  cafe: 'Cafe',
  fastfood: 'Fast Food',
  bar: 'Bar / Pub',
  grocery: 'Grocery',
  shop: 'Shop',
  bank: 'Bank',
  pharmacy: 'Pharmacy',
  hospital: 'Hospital',
  school: 'School',
  hotel: 'Hotel',
  fuel: 'Fuel',
  worship: 'Place of Worship',
  gym: 'Gym',
  park: 'Park',
  default: 'Place',
};
