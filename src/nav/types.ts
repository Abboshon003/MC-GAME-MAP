/** Shared navigation types. */

export interface LatLng {
  lat: number;
  lon: number;
}

/** A geocoded place (search result / saved place / destination). */
export interface Place {
  id: string;
  name: string;
  /** Secondary line, e.g. full address */
  detail?: string;
  location: LatLng;
  category?: 'home' | 'work' | 'food' | 'gas' | 'parking' | 'destination' | 'star';
}

/** One turn-by-turn maneuver. */
export interface RouteStep {
  /** Game-flavored instruction, e.g. "Turn left onto Oak Street" */
  instruction: string;
  /** Maneuver kind for choosing an arrow glyph */
  kind:
    | 'depart'
    | 'left'
    | 'right'
    | 'slight-left'
    | 'slight-right'
    | 'sharp-left'
    | 'sharp-right'
    | 'straight'
    | 'uturn'
    | 'roundabout'
    | 'merge'
    | 'fork'
    | 'arrive';
  /** Where the maneuver happens */
  location: LatLng;
  /** Meters from this maneuver to the next one */
  distanceMeters: number;
  /** Along-route offset (meters from route start) of the maneuver point */
  offsetMeters: number;
  roadName?: string;
}

/** A computed route. */
export interface Route {
  /** Full geometry, ordered from origin to destination */
  coords: LatLng[];
  /** Cumulative distance (meters) at each coord; same length as coords */
  cumulative: number[];
  distanceMeters: number;
  durationSeconds: number;
  steps: RouteStep[];
  destinationName: string;
}

/** A live position fix (GPS or demo drive). */
export interface PositionFix {
  location: LatLng;
  /** Degrees clockwise from north, if known */
  heading?: number;
  /** Meters per second, if known */
  speed?: number;
}

/** Live navigation state derived every fix. */
export interface NavState {
  /** Position snapped onto the route line */
  snapped: LatLng;
  /** Raw fix */
  raw: PositionFix;
  /** Index of the active step */
  stepIndex: number;
  /** Meters until the active step's maneuver point */
  distanceToManeuver: number;
  /** Meters left to destination */
  remainingMeters: number;
  /** Seconds left (route-speed estimate) */
  remainingSeconds: number;
  /** Perpendicular distance from raw fix to the route (meters) */
  offRouteMeters: number;
  /** True while the engine considers the user off the route */
  offRoute: boolean;
  arrived: boolean;
}
