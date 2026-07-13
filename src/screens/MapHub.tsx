import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BlockButton,
  CornerMenu,
  PixelPanel,
  PixelText,
  PoiCallout,
  PoiPin,
  SearchOverlay,
  TravelModeToggle,
  TurnArrow,
  XPProgressBar,
} from '@/components';
import { CompassIcon } from '@/icons';
import { ParchmentMap } from '@/map/ParchmentMap';
import { VoxelWorld3D, type MapProjector } from '@/map3d/VoxelWorld3D';
import { daylightFor } from '@/map/daylight';
import { useWorldTiles } from '@/map/useWorldTiles';
import {
  cameraAfterGesture,
  fitBounds,
  makeProjector,
  type MapCamera,
  type Viewport,
} from '@/map/projection';
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
import type { WorldRoad } from '@/map/worldData';
import { colors, spacing } from '@/theme';
import { play } from '@/sound/sounds';

/** Fallback when GPS is denied/unavailable — NYC. Demo drive uses it too. */
const FALLBACK: LatLng = { lat: 40.758, lon: -73.9855 };

/** Small self-contained chip style for terrain status messages. */
const statusChip = {
  alignSelf: 'center' as const,
  marginTop: 6,
  paddingHorizontal: 8,
  paddingVertical: 3,
  backgroundColor: 'rgba(20,20,20,0.78)',
};
/** Camera zoom for browsing — keeps blocks chunky. */
const WORLD_ZOOM = 17;
/** Camera zoom while navigating (slightly wider for context). */
const NAV_ZOOM = 16;

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
  const [projector, setProjector] = useState<MapProjector | null>(null);
  const [glFailed, setGlFailed] = useState(false);
  const arrivedSound = useRef(false);

  // — position —
  const { fix: gpsFix } = useGpsPosition(true);
  const liveLoc = gpsFix?.location ?? null;
  const browseCenter = liveLoc ?? FALLBACK;
  const demoFix = useDemoDrive(route, navigating && !liveLoc);
  const fix = liveLoc ? gpsFix : demoFix;

  // — free camera: null = follow (GPS / route fit); set = user panned/zoomed —
  const [freeCam, setFreeCam] = useState<MapCamera | null>(null);
  // live gesture transform applied to the frozen map (cheap), committed on release
  const [gestureXf, setGestureXf] = useState({ tx: 0, ty: 0, s: 1 });

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

  // — camera: user gestures win; otherwise follow GPS / fit the route —
  const view: Viewport = { width: mapSize.w, height: mapSize.h };
  const camera: MapCamera = useMemo(() => {
    if (freeCam) return freeCam;
    if (route && !navigating && mapSize.w > 0) return fitBounds(route.coords, view, 60);
    if (navigating && nav) return { center: nav.snapped, zoom: NAV_ZOOM };
    return { center: browseCenter, zoom: WORLD_ZOOM };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [freeCam, route, navigating, nav?.snapped?.lat, nav?.snapped?.lon, browseCenter.lat, browseCenter.lon, mapSize.w, mapSize.h]);

  // — live world tiles around wherever the camera looks (pan → new area loads) —
  const tiles = useWorldTiles(mapSize.w > 0 ? camera.center : browseCenter);

  // — pan / pinch gestures (Google-Maps feel): transform the frozen map
  //   during the gesture, commit a real camera move on release —
  const gestureRef = useRef({ tx: 0, ty: 0, s: 1, mid0: null as null | { x: number; y: number }, dist0: 0, base: { tx: 0, ty: 0, s: 1 } });
  const camRef = useRef(camera);
  camRef.current = camera;
  const viewRef = useRef(view);
  viewRef.current = view;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_e, g) =>
          Math.abs(g.dx) + Math.abs(g.dy) > 6 || g.numberActiveTouches === 2,
        onPanResponderGrant: () => {
          gestureRef.current = { tx: 0, ty: 0, s: 1, mid0: null, dist0: 0, base: { tx: 0, ty: 0, s: 1 } };
        },
        onPanResponderMove: (e, g) => {
          const cur = gestureRef.current;
          const touches = e.nativeEvent.touches;
          if (touches.length >= 2) {
            const [a, b] = touches;
            const mid = { x: (a.pageX + b.pageX) / 2, y: (a.pageY + b.pageY) / 2 };
            const dist = Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
            if (!cur.mid0 || cur.dist0 === 0) {
              // pinch segment starts: rebase on current transform
              cur.mid0 = mid;
              cur.dist0 = dist;
              cur.base = { tx: cur.tx, ty: cur.ty, s: cur.s };
              return;
            }
            const cx = viewRef.current.width / 2;
            const cy = viewRef.current.height / 2;
            const s = Math.max(0.35, Math.min(3, cur.base.s * (dist / cur.dist0)));
            const k = s / cur.base.s;
            cur.s = s;
            // keep the world point under the fingers anchored to the midpoint
            cur.tx = mid.x - cur.mid0.x + cur.base.tx + (cur.mid0.x - cx - cur.base.tx) * (1 - k);
            cur.ty = mid.y - cur.mid0.y + cur.base.ty + (cur.mid0.y - cy - cur.base.ty) * (1 - k);
          } else {
            // one-finger drag; if we just came out of a pinch, rebase
            if (cur.mid0) {
              cur.mid0 = null;
              cur.dist0 = 0;
              cur.base = { tx: cur.tx - g.dx, ty: cur.ty - g.dy, s: cur.s };
            }
            cur.tx = cur.base.tx + g.dx;
            cur.ty = cur.base.ty + g.dy;
          }
          setGestureXf({ tx: cur.tx, ty: cur.ty, s: cur.s });
        },
        onPanResponderRelease: () => commitGesture(),
        onPanResponderTerminate: () => commitGesture(),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const commitGesture = () => {
    const { tx, ty, s } = gestureRef.current;
    if (Math.abs(tx) < 2 && Math.abs(ty) < 2 && Math.abs(s - 1) < 0.02) {
      setGestureXf({ tx: 0, ty: 0, s: 1 });
      return;
    }
    setFreeCam(cameraAfterGesture(camRef.current, viewRef.current, tx, ty, s));
    setGestureXf({ tx: 0, ty: 0, s: 1 });
    gestureRef.current = { tx: 0, ty: 0, s: 1, mid0: null, dist0: 0, base: { tx: 0, ty: 0, s: 1 } };
  };

  const zoomBy = (factor: number) => {
    play('button-click');
    setFreeCam(cameraAfterGesture(camRef.current, viewRef.current, 0, 0, factor));
  };
  const recenter = () => {
    play('wood-tap');
    setFreeCam(null);
  };

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
    setFreeCam(null); // snap to the route overview
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
    setFreeCam(null); // follow the player
    setNavigating(true);
    play('map-scribble');
  };
  const clearRoute = () => {
    setNavigating(false);
    setFreeCam(null);
    setRoute(null);
    setDestination(null);
    setSelectedPoi(null);
  };

  const step = nav && route ? route.steps[nav.stepIndex] : route?.steps[0];
  const remaining = nav ? nav.remainingMeters : route?.distanceMeters ?? 0;
  const remainingSecs = nav ? nav.remainingSeconds : route?.durationSeconds ?? 0;
  const progress = route ? 1 - remaining / Math.max(1, route.distanceMeters) : 0;

  // world → screen for overlay pins/labels: the 3D projector when GL is live,
  // the flat mercator projector when the SVG fallback is showing.
  const locate = useMemo(() => {
    if (projector && !glFailed) return (p: LatLng) => projector.project(p);
    const proj = makeProjector(camera, view);
    return (p: LatLng) => ({ ...proj(p), visible: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projector, glFailed, camera, mapSize.w, mapSize.h]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.charcoal }}>
      {/* ——— full-bleed voxel map with pan/pinch ——— */}
      <View
        style={{ flex: 1, overflow: 'hidden' }}
        onLayout={(e) => setMapSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
        {...panResponder.panHandlers}
      >
        {/* Gesture layer: the map + markers move together as one frozen
            image during a gesture; the camera commits on release. */}
        <View
          style={{
            flex: 1,
            transform: [
              { translateX: gestureXf.tx },
              { translateY: gestureXf.ty },
              { scale: gestureXf.s },
            ],
          }}
        >
          {mapSize.w > 0 &&
            (glFailed ? (
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
            ) : (
              <VoxelWorld3D
                world={tiles.grid}
                features={tiles.world}
                route={route}
                camera={camera}
                player={navigating && nav ? nav.snapped : browseCenter}
                heading={fix?.heading ?? 0}
                destination={destination?.location ?? null}
                daylight={daylight}
                width={mapSize.w}
                height={mapSize.h}
                onCameraChange={(p) => setProjector(() => p)}
                onFail={() => setGlFailed(true)}
              />
            ))}

          {/* ——— street name labels ——— */}
          {mapSize.w > 0 && !navigating && tiles.world && (
            <StreetLabelsOverlay
              roads={tiles.world.roads}
              locate={locate}
              width={mapSize.w}
              height={mapSize.h}
            />
          )}

          {/* ——— tappable business pins (real names, category colors) ——— */}
          {mapSize.w > 0 &&
            nearbyPois.map(({ p }, idx) => {
              const pos = locate(p.location);
              if (!pos.visible) return null;
              if (pos.x < -30 || pos.x > mapSize.w + 30 || pos.y < -30 || pos.y > mapSize.h + 30) return null;
              return (
                <View key={p.id} style={{ position: 'absolute', left: pos.x - 15, top: pos.y - 38 }}>
                  <PoiPin
                    category={p.category}
                    name={p.name}
                    showLabel={idx < 8}
                    onPress={() => openPoi(p)}
                  />
                </View>
              );
            })}
        </View>

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

        {/* ——— map controls: zoom blocks + recenter (Google-Maps UX) ——— */}
        <View style={{ position: 'absolute', right: spacing.sm, bottom: spacing.xl * 3 }}>
          <BlockButton title="+" compact onPress={() => zoomBy(1.6)} />
          <BlockButton title="-" compact style={{ marginTop: spacing.xs }} onPress={() => zoomBy(1 / 1.6)} />
          {freeCam && (
            <Pressable
              onPress={recenter}
              accessibilityRole="button"
              accessibilityLabel="Recenter"
              style={{ marginTop: spacing.sm, alignItems: 'center' }}
            >
              <View
                style={{
                  backgroundColor: colors.panelStone,
                  borderWidth: 3,
                  borderColor: colors.buttonBorder,
                  padding: 4,
                }}
              >
                <CompassIcon size={30} />
              </View>
            </Pressable>
          )}
        </View>
      </View>

      {/* ——— top: corner menu + search ——— */}
      <View style={{ position: 'absolute', top: insets.top + spacing.sm, left: spacing.sm, right: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          <CornerMenu />
          <View style={{ flex: 1, marginLeft: spacing.sm }}>
            {!navigating && <SearchOverlay near={liveLoc} onSelect={chooseDestination} />}
          </View>
        </View>
        {/* terrain status chip — makes a blank map diagnosable at a glance */}
        {tiles.loading && !tiles.grid && (
          <PixelText variant="tiny" color={colors.textLight} style={statusChip}>
            Generating chunks…
          </PixelText>
        )}
        {tiles.failed && !tiles.grid && !tiles.loading && (
          <PixelText variant="tiny" color={colors.dangerRed} style={statusChip}>
            TERRAIN DATA UNAVAILABLE — CHECK CONNECTION
          </PixelText>
        )}
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

/** Street-name chips positioned & rotated along their (projected) roads. */
function StreetLabelsOverlay({
  roads,
  locate,
  width,
  height,
}: {
  roads: WorldRoad[];
  locate: (p: LatLng) => { x: number; y: number; visible: boolean };
  width: number;
  height: number;
}) {
  const labels: Array<{ name: string; x: number; y: number; angle: number; len: number }> = [];
  const seen = new Set<string>();

  for (const road of roads) {
    if (!road.name || seen.has(road.name) || road.pts.length < 2) continue;
    const a = locate(road.pts[0]);
    const b = locate(road.pts[road.pts.length - 1]);
    const mid = locate(road.pts[Math.floor(road.pts.length / 2)]);
    if (!mid.visible) continue;
    if (mid.x < 30 || mid.x > width - 30 || mid.y < 40 || mid.y > height - 40) continue;
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (len < 90) continue;
    let angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
    if (angle > 90) angle -= 180;
    if (angle < -90) angle += 180;
    seen.add(road.name);
    labels.push({ name: road.name, x: mid.x, y: mid.y, angle, len });
  }

  // longest roads win; drop labels that would collide with an accepted one
  labels.sort((m, n) => n.len - m.len);
  const placed: Array<{ x: number; y: number }> = [];
  const spaced = labels.filter((l) => {
    if (placed.some((p) => Math.hypot(p.x - l.x, p.y - l.y) < 90)) return false;
    placed.push({ x: l.x, y: l.y });
    return true;
  });

  return (
    <>
      {spaced.slice(0, 8).map((l) => (
        <View
          key={l.name}
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: l.x - 70,
            top: l.y - 10,
            width: 140,
            alignItems: 'center',
            transform: [{ rotate: `${l.angle.toFixed(1)}deg` }],
          }}
        >
          <PixelText
            variant="bodySM"
            color="#FFFFFF"
            numberOfLines={1}
            style={{
              textShadowColor: '#1E1E1E',
              textShadowOffset: { width: 1.5, height: 1.5 },
              textShadowRadius: 0,
            }}
          >
            {l.name}
          </PixelText>
        </View>
      ))}
    </>
  );
}
