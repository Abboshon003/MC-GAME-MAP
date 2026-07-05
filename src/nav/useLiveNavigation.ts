import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { bearingDegrees, haversineMeters, offsetOfProjection, projectOntoRoute } from './geo';
import type { LatLng, NavState, PositionFix, Route } from './types';

/** Meters from the route line before we consider the player off-route. */
const OFF_ROUTE_METERS = 45;
/** Consecutive off-route fixes required to trigger a reroute. */
const OFF_ROUTE_FIXES = 3;
/** Arrival radius in meters. */
const ARRIVE_METERS = 25;

/**
 * The live turn-by-turn engine. Feed it a route and a stream of position
 * fixes; it emits snapped position, active step, distance-to-turn, ETA and
 * off-route detection (which triggers `onNeedReroute`).
 */
export function useLiveNavigation(
  route: Route | null,
  fix: PositionFix | null,
  onNeedReroute?: (from: LatLng) => void,
): NavState | null {
  const lastSegIndex = useRef<number | undefined>(undefined);
  const offRouteCount = useRef(0);
  const rerouteRequested = useRef(false);

  // Reset per-route state whenever the route object changes.
  useEffect(() => {
    lastSegIndex.current = undefined;
    offRouteCount.current = 0;
    rerouteRequested.current = false;
  }, [route]);

  return useMemo<NavState | null>(() => {
    if (!route || !fix) return null;

    const proj = projectOntoRoute(fix.location, route.coords, lastSegIndex.current);
    lastSegIndex.current = proj.segIndex;
    const offset = offsetOfProjection(proj, route.cumulative, route.coords);

    // Active step: first step whose maneuver point is still ahead
    // (skipping the initial depart step once we're moving).
    let stepIndex = route.steps.length - 1;
    for (let i = 0; i < route.steps.length; i++) {
      if (route.steps[i].offsetMeters > offset + 5) {
        stepIndex = i;
        break;
      }
    }

    const remainingMeters = Math.max(0, route.distanceMeters - offset);
    const avgSpeed =
      route.durationSeconds > 0 ? route.distanceMeters / route.durationSeconds : 12;
    const liveSpeed = fix.speed && fix.speed > 1 ? fix.speed : avgSpeed;
    const remainingSeconds = remainingMeters / liveSpeed;

    const distanceToManeuver = Math.max(
      0,
      route.steps[stepIndex].offsetMeters - offset,
    );

    const arrived =
      haversineMeters(fix.location, route.coords[route.coords.length - 1]) < ARRIVE_METERS ||
      remainingMeters < ARRIVE_METERS;

    // Off-route bookkeeping
    if (proj.distanceMeters > OFF_ROUTE_METERS && !arrived) {
      offRouteCount.current += 1;
    } else {
      offRouteCount.current = 0;
      rerouteRequested.current = false;
    }
    const offRoute = offRouteCount.current >= OFF_ROUTE_FIXES;
    if (offRoute && !rerouteRequested.current && onNeedReroute) {
      rerouteRequested.current = true;
      onNeedReroute(fix.location);
    }

    return {
      snapped: proj.point,
      raw: fix,
      stepIndex,
      distanceToManeuver,
      remainingMeters,
      remainingSeconds,
      offRouteMeters: proj.distanceMeters,
      offRoute,
      arrived,
    };
  }, [route, fix, onNeedReroute]);
}

/**
 * Real GPS position stream via expo-location (browser geolocation on web).
 * Returns null until the first fix; `error` reports denied permission.
 */
export function useGpsPosition(enabled: boolean): {
  fix: PositionFix | null;
  error: string | null;
} {
  const [fix, setFix] = useState<PositionFix | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let sub: Location.LocationSubscription | null = null;
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (!cancelled) setError('Location permission denied');
          return;
        }
        sub = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            timeInterval: 1000,
            distanceInterval: 2,
          },
          (loc) => {
            if (cancelled) return;
            setFix({
              location: { lat: loc.coords.latitude, lon: loc.coords.longitude },
              heading: loc.coords.heading ?? undefined,
              speed: loc.coords.speed ?? undefined,
            });
          },
        );
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'GPS unavailable');
      }
    })();
    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, [enabled]);

  return { fix, error };
}

/**
 * Demo drive: simulates a player moving along the route at `speedMps`.
 * Used for trying the app without moving (and in the browser).
 */
export function useDemoDrive(
  route: Route | null,
  enabled: boolean,
  speedMps = 14,
): PositionFix | null {
  const [fix, setFix] = useState<PositionFix | null>(null);
  const offsetRef = useRef(0);

  useEffect(() => {
    offsetRef.current = 0;
    if (!route || !enabled) {
      setFix(null);
      return;
    }
    const tickMs = 500;
    const id = setInterval(() => {
      offsetRef.current = Math.min(
        offsetRef.current + (speedMps * tickMs) / 1000,
        route.distanceMeters,
      );
      const pos = pointAtOffset(route, offsetRef.current);
      setFix(pos);
      if (offsetRef.current >= route.distanceMeters) clearInterval(id);
    }, tickMs);
    return () => clearInterval(id);
  }, [route, enabled, speedMps]);

  return fix;
}

/** Interpolate the route point (and heading) at an along-route offset. */
function pointAtOffset(route: Route, offset: number): PositionFix {
  const { coords, cumulative } = route;
  let i = 1;
  while (i < cumulative.length - 1 && cumulative[i] < offset) i++;
  const segLen = cumulative[i] - cumulative[i - 1] || 1;
  const t = Math.max(0, Math.min(1, (offset - cumulative[i - 1]) / segLen));
  const lat = coords[i - 1].lat + t * (coords[i].lat - coords[i - 1].lat);
  const lon = coords[i - 1].lon + t * (coords[i].lon - coords[i - 1].lon);
  return {
    location: { lat, lon },
    heading: bearingDegrees(coords[i - 1], coords[i]),
    speed: 14,
  };
}
