import React, { useMemo } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { MapHub } from '@/screens/MapHub';
import type { Place } from '@/nav/types';

/**
 * Home = the live voxel map. Opens straight into MapHub (no title screen).
 * Optional name/lat/lon params (e.g. from Saved Places) preload a destination.
 */
export default function Home() {
  const params = useLocalSearchParams<{ name?: string; lat?: string; lon?: string }>();

  const initialDestination: Place | null = useMemo(() => {
    if (!params.lat || !params.lon) return null;
    const lat = parseFloat(params.lat);
    const lon = parseFloat(params.lon);
    if (Number.isNaN(lat) || Number.isNaN(lon)) return null;
    return {
      id: `dest-${lat},${lon}`,
      name: params.name ?? 'Destination',
      location: { lat, lon },
      category: 'destination',
    };
  }, [params.name, params.lat, params.lon]);

  return <MapHub initialDestination={initialDestination} />;
}
