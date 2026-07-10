import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BlockButton,
  CornerMenu,
  PixelPanel,
  PixelText,
  PoiCallout,
  SearchOverlay,
  TravelModeToggle,
  TurnArrow,
  XPProgressBar,
} from '@/components';
import { PoiIcon } from '@/icons';
import { ParchmentMap } from '@/map/ParchmentMap';
import { daylightFor } from '@/map/daylight';
import { useWorldTiles } from '@/map/useWorldTiles';
import { fitBounds, makeProjector, type MapCamera, type Viewport } from '@/map/projection';
import {
  fetchRoute,
  formatDistance,
  formatDuration,
  haversineMeters,
  useDemoDrive,
  useGpsPosition,
  useLiveNavigation,
} from '@/nav';
import type { LatLng, Place, RouteProfile, Route } from '@/nav/types';
import type { Poi } from '@/nav/poi';
import { colors, spacing } from '@/theme';
import { play } from '@/sound/sounds';

/** Fallback when GPS is denied/unavailable — NYC. Demo drive uses it too. */
const FALLBACK: LatLng = { lat: 40.758, lon: -73.9855 };
/** Camera zoom for browsing/following — keeps blocks chunky. */
const WORLD_ZOOM = 17;

/**
 * The whole app in one screen: a live voxel world you can browse, search over,
 * and navigate on. Opens straight to the map (no title screen). Search bar +
 * corner menu on top; route HUD at the bottom appears once a destination is
 * chosen.
 */
export function MapHub({ initialDestination }: { initialDestination?: Place | null }) {
  const insets = useSafeAreaInsets();

  const [destination, setDestination] = useState<Place | null>(initialDestination ?? null);
  const [profile, setProfile] = useState<RouteProfile>('drive');
  const [route, setRoute] = useState<Route | null>(null);
  const [routing, setRouting] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [navigating, setNavigating] = useState(false);
  const [rerouting, setRerouting] = useState(false);
  const [selectedPoi, setSelectedPoi] = useState<{ poi: Poi; distance: number } | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [mapSize, setMapSize] = useState({ w: 0, h: 0 });
  const arrivedSound = useRef(false);

  // — position —
  const { fix: gpsFix } = useGpsPosition(true);
  const liveLoc = gpsFix?.location ?? null;
  const browseCenter = liveLoc ?? FALLBACK;
  const demoFix = useDemoDrive(route, navigating && !liveLoc);
  const fix = liveLoc ? gpsFix : demoFix;

  // — live world tiles around the player —
  const tiles = useWorldTiles(browseCenter);

  // — day/night clock —
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  const daylight = useMemo(() => daylightFor(now), [now]);

  // — craft route when a destination or travel mode is chosen —
  useEffect(() => {
    if (!destination) {
      setRoute(null);
      setRouteError(null);
      return;
    }
    const origin = liveLoc ?? FALLBACK;
    let cancelled = false;
    setRouting(true);
    setRouteError(null);
    (async () => {
      try {
        const r = await fetchRoute(origin, destination.location, destination.name, profile);
        if (cancelled) return;
        setRoute(r);
        play('paper-unfold');
      } catch (e) {
        if (cancelled) return;
        setRouteError(e instanceof Error ? e.message : 'Route crafting failed');
        setRoute(null);
      } finally {
        if (!cancelled) setRouting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // origin is snapshotted at selection time on purpose (avoids refetch spam).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destination, profile]);

  // — live reroute when off-route —
  const onNeedReroute = useCallback(
    (from: LatLng) => {
      if (rerouting || !destination) return;
      setRerouting(true);
      play('reroute');
      (async () => {
        try {
          const r = await fetchRoute(from, destination.location, destination.name, profile);
          setRoute(r);
        } catch {
          /* keep old route */
        } finally {
          setRerouting(false);
        }
      })();
    },
    [rerouting, destination, profile],
  );

  const nav = useLiveNavigation(route, navigating ? fix : null, onNeedReroute);

  useEffect(() => {
    if (nav?.arrived && !arrivedSound.current) {
      arrivedSound.current = true;
      play('route-done');
    }
  }, [nav?.arrived]);

  // — camera —
  const view: Viewport = { width: mapSize.w, height: mapSize.h };
  const camera: MapCamera = useMemo(() => {
    if (route && !navigating && mapSize.w > 0) return fitBounds(route.coords, view, 60);
    const center = navigating && nav ? nav.snapped : browseCenter;
    return { center, zoom: WORLD_ZOOM };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route, navigating, nav?.snapped?.lat, nav?.snapped?.lon, browseCenter.lat, browseCenter.lon, mapSize.w, mapSize.h]);

  // — nearest POIs to show as tappable markers (browse only) —
  const nearbyPois = useMemo(() => {
    if (navigating) return [];
    return tiles.pois
      .map((p) => ({ p, d: haversineMeters(browseCenter, p.location) }))
      .filter((x) => x.d > 15) // don't cover the player marker
      .sort((a, b) => a.d - b.d)
      .slice(0, 40);
  }, [tiles.pois, browseCenter.lat, browseCenter.lon, navigating]);

  // — actions —
  const chooseDestination = (place: Place) => {
    setSelectedPoi(null);
    setNavigating(false);
    arrivedSound.current = false;
    setDestination(place);
  };
  const openPoi = (poi: Poi) => {
    play('wood-tap');
    setSelectedPoi({ poi, distance: haversineMeters(browseCenter, poi.location) });
  };
  const navigateToPoi = () => {
    if (!selectedPoi) return;
    const { poi } = selectedPoi;
    chooseDestination({ id: poi.id, name: poi.name, location: poi.location, category: 'destination' });
  };
  const beginQuest = () => {
    arrivedSound.current = false;
    setNavigating(true);
    play('map-scribble');
  };
  const clearRoute = () => {
    setNavigating(false);
    setRoute(null);
    setDestination(null);
    setSelectedPoi(null);
  };

  const step = nav && route ? route.steps[nav.stepIndex] : route?.steps[0];
  const remaining = nav ? nav.remainingMeters : route?.distanceMeters ?? 0;
  const remainingSecs = nav ? nav.remainingSeconds : route?.durationSeconds ?? 0;
  const progress = route ? 1 - remaining / Math.max(1, route.distanceMeters) : 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.charcoal }}>
      {/* ——— full-bleed voxel map ——— */}
      <View
        style={{ flex: 1 }}
        onLayout={(e) => setMapSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      >
        {mapSize.w > 0 && (
          <ParchmentMap
            camera={camera}
            route={route}
            player={navigating && nav ? nav.snapped : browseCenter}
            heading={fix?.heading ?? 0}
            destination={destination?.location ?? null}
            world={tiles.grid}
            features={tiles.world}
            daylight={daylight}
            detail={navigating ? 'lite' : 'full'}
            width={mapSize.w}
            height={mapSize.h}
          />
        )}

        {/* ——— tappable business markers ——— */}
        {mapSize.w > 0 &&
          nearbyPois.map(({ p }) => {
            // must match the map's projector (iso while browsing)
            const pos = makeProjector(camera, view, !navigating)(p.location);
            if (pos.x < -20 || pos.x > mapSize.w + 20 || pos.y < -20 || pos.y > mapSize.h + 20) return null;
            return (
              <Pressable
                key={p.id}
                onPress={() => openPoi(p)}
                style={{ position: 'absolute', left: pos.x - 15, top: pos.y - 15, flexDirection: 'row', alignItems: 'center' }}
                hitSlop={6}
              >
                <PoiIcon category={p.category} size={30} />
                <View
                  style={{
                    marginLeft: 2,
                    paddingHorizontal: 3,
                    paddingVertical: 1,
                    backgroundColor: 'rgba(20,20,20,0.72)',
                    maxWidth: 96,
                  }}
                >
                  <PixelText variant="tiny" color={colors.textLight} numberOfLines={1}>
                    {p.name}
                  </PixelText>
                </View>
              </Pressable>
            );
          })}

        {/* ——— reroute overlay ——— */}
        {rerouting && (
          <View style={{ position: 'absolute', top: '46%', left: spacing.xl, right: spacing.xl, alignItems: 'center' }}>
            <PixelPanel texture="stone">
              <PixelText variant="label" color={colors.routeGold} align="center">
                Recalculating path…
              </PixelText>
            </PixelPanel>
          </View>
        )}
      </View>

      {/* ——— top: corner menu + search ——— */}
      <View style={{ position: 'absolute', top: insets.top + spacing.sm, left: spacing.sm, right: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          <CornerMenu />
          <View style={{ flex: 1, marginLeft: spacing.sm }}>
            {!navigating && <SearchOverlay near={liveLoc} onSelect={chooseDestination} />}
          </View>
        </View>
      </View>

      {/* ——— bottom HUD ——— */}
      <BottomHud
        insets={insets.bottom}
        routing={routing}
        routeError={routeError}
        route={route}
        navigating={navigating}
        arrived={!!nav?.arrived}
        destName={destination?.name}
        remaining={remaining}
        remainingSecs={remainingSecs}
        progress={progress}
        distanceToManeuver={nav?.distanceToManeuver ?? 0}
        step={step}
        profile={profile}
        daylightLabel={daylight.label}
        selectedPoi={selectedPoi}
        onProfile={setProfile}
        onBegin={beginQuest}
        onEnd={() => setNavigating(false)}
        onClear={clearRoute}
        onRetry={() => setProfile((p) => p)}
        onNavigatePoi={navigateToPoi}
        onClosePoi={() => setSelectedPoi(null)}
      />
    </View>
  );
}

/** Bottom HUD: POI callout, route preview, turn-by-turn, or arrival. */
function BottomHud(props: {
  insets: number;
  routing: boolean;
  routeError: string | null;
  route: Route | null;
  navigating: boolean;
  arrived: boolean;
  destName?: string;
  remaining: number;
  remainingSecs: number;
  progress: number;
  distanceToManeuver: number;
  step?: Route['steps'][number];
  profile: RouteProfile;
  daylightLabel: string;
  selectedPoi: { poi: Poi; distance: number } | null;
  onProfile: (p: RouteProfile) => void;
  onBegin: () => void;
  onEnd: () => void;
  onClear: () => void;
  onRetry: () => void;
  onNavigatePoi: () => void;
  onClosePoi: () => void;
}) {
  const {
    insets, routing, routeError, route, navigating, arrived, destName, remaining, remainingSecs,
    progress, distanceToManeuver, step, profile, daylightLabel, selectedPoi,
    onProfile, onBegin, onEnd, onClear, onRetry, onNavigatePoi, onClosePoi,
  } = props;

  // Nothing to route yet: show the POI callout (if any) over a slim status bar.
  if (!route && !routing && !routeError) {
    return (
      <View style={{ position: 'absolute', left: spacing.sm, right: spacing.sm, bottom: insets + spacing.sm }}>
        {selectedPoi ? (
          <PoiCallout
            poi={selectedPoi.poi}
            distanceMeters={selectedPoi.distance}
            onNavigate={onNavigatePoi}
            onClose={onClosePoi}
          />
        ) : (
          <PixelPanel texture="stone" padded={false}>
            <View style={{ padding: spacing.md }}>
              <PixelText variant="bodySM" color={colors.textDim} align="center">
                Search or tap a place to start a quest · {daylightLabel}
              </PixelText>
            </View>
          </PixelPanel>
        )}
      </View>
    );
  }

  return (
    <View
      style={{
        padding: spacing.sm,
        paddingBottom: insets + spacing.sm,
        backgroundColor: colors.panelStoneDark,
        borderTopWidth: 3,
        borderTopColor: '#141414',
      }}
    >
      {routing ? (
        <PixelPanel texture="stone">
          <PixelText variant="label" color={colors.routeGold} align="center">
            Crafting route…
          </PixelText>
        </PixelPanel>
      ) : routeError ? (
        <PixelPanel texture="stone">
          <PixelText variant="label" color={colors.dangerRed} align="center">
            ROUTE CRAFTING FAILED
          </PixelText>
          <PixelText variant="bodySM" color={colors.textDim} align="center" style={{ marginTop: spacing.xs }}>
            {routeError}
          </PixelText>
          <View style={{ flexDirection: 'row', marginTop: spacing.md }}>
            <BlockButton title="RETRY" tone="gold" style={{ flex: 1 }} onPress={onRetry} />
            <BlockButton title="CANCEL" tone="stone" compact style={{ marginLeft: spacing.sm }} onPress={onClear} />
          </View>
        </PixelPanel>
      ) : arrived ? (
        <PixelPanel texture="stone">
          <PixelText variant="title" color={colors.xpGreen} align="center">
            YOU HAVE ARRIVED!
          </PixelText>
          <PixelText variant="bodySM" color={colors.textDim} align="center" style={{ marginTop: spacing.xs }}>
            Quest complete: {destName}
          </PixelText>
          <BlockButton title="DONE" tone="gold" style={{ marginTop: spacing.md }} onPress={onClear} />
        </PixelPanel>
      ) : navigating && step ? (
        <PixelPanel texture="stone" padded={false}>
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.md }}>
            <TurnArrow kind={step.kind} size={52} />
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <PixelText variant="bodyLG" numberOfLines={2}>
                {step.instruction}
              </PixelText>
              <PixelText variant="distance" color={colors.routeGold}>
                {formatDistance(distanceToManeuver)}
              </PixelText>
            </View>
            <BlockButton title="END" tone="danger" compact onPress={onEnd} />
          </View>
          <View style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.md }}>
            <XPProgressBar progress={progress} height={10} />
          </View>
        </PixelPanel>
      ) : (
        // route preview
        <PixelPanel texture="stone">
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1, marginRight: spacing.md }}>
              <PixelText variant="body" color={colors.routeGold} numberOfLines={1}>
                {destName?.toUpperCase()}
              </PixelText>
              <PixelText variant="bodySM" color={colors.textDim}>
                {formatDistance(remaining)} · {formatDuration(remainingSecs)}
              </PixelText>
            </View>
            <BlockButton title="X" tone="stone" compact onPress={onClear} />
          </View>
          <View style={{ marginTop: spacing.md }}>
            <TravelModeToggle value={profile} onChange={onProfile} />
          </View>
          <BlockButton title="BEGIN QUEST" tone="gold" style={{ marginTop: spacing.md }} onPress={onBegin} />
        </PixelPanel>
      )}
    </View>
  );
}
