import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BlockButton,
  LoadingScreen,
  PixelPanel,
  PixelText,
  TurnArrow,
  XPProgressBar,
} from '@/components';
import { ParchmentMap } from '@/map/ParchmentMap';
import {
  fetchRoute,
  formatDistance,
  formatDuration,
  useDemoDrive,
  useGpsPosition,
  useLiveNavigation,
} from '@/nav';
import type { LatLng, Route } from '@/nav/types';
import { colors, spacing } from '@/theme';
import { play } from '@/sound/sounds';

/** Fallback origin (used when GPS is unavailable — demo drive kicks in). */
const FALLBACK_ORIGIN: LatLng = { lat: 37.7955, lon: -122.3937 };
/** How long to wait for a first GPS fix before falling back to demo. */
const GPS_WAIT_MS = 5000;

type Phase = 'locating' | 'routing' | 'ready' | 'error';

/**
 * The Parchment Map screen: live turn-by-turn navigation rendered as an
 * adventure map. Camera follows the player triangle along a gold route;
 * pixel panels carry the instructions; going off-route triggers
 * "Recalculating path…" and a live reroute.
 */
export default function MapScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ name?: string; lat?: string; lon?: string }>();

  const destination: LatLng = useMemo(
    () => ({ lat: parseFloat(params.lat ?? '0'), lon: parseFloat(params.lon ?? '0') }),
    [params.lat, params.lon],
  );
  const destName = params.name ?? 'Destination';

  const [phase, setPhase] = useState<Phase>('locating');
  const [route, setRoute] = useState<Route | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [navigating, setNavigating] = useState(false);
  const [rerouting, setRerouting] = useState(false);
  const [source, setSource] = useState<'gps' | 'demo'>('gps');
  const [mapSize, setMapSize] = useState({ w: 0, h: 0 });
  const arrivedSoundPlayed = useRef(false);

  // — position sources —
  const { fix: gpsFix, error: gpsError } = useGpsPosition(true);
  const demoFix = useDemoDrive(route, navigating && source === 'demo');
  const fix = source === 'demo' ? demoFix : gpsFix;

  // — resolve origin: first GPS fix, or fallback + demo mode —
  const originRef = useRef<LatLng | null>(null);
  useEffect(() => {
    if (phase !== 'locating') return;
    if (gpsFix) {
      originRef.current = gpsFix.location;
      setPhase('routing');
      return;
    }
    if (gpsError) {
      originRef.current = FALLBACK_ORIGIN;
      setSource('demo');
      setPhase('routing');
      return;
    }
    const t = setTimeout(() => {
      originRef.current = FALLBACK_ORIGIN;
      setSource('demo');
      setPhase('routing');
    }, GPS_WAIT_MS);
    return () => clearTimeout(t);
  }, [phase, gpsFix, gpsError]);

  // — craft the route —
  useEffect(() => {
    if (phase !== 'routing' || !originRef.current) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetchRoute(originRef.current!, destination, destName);
        if (cancelled) return;
        setRoute(r);
        setPhase('ready');
        play('paper-unfold');
      } catch (e) {
        if (cancelled) return;
        setErrorMsg(e instanceof Error ? e.message : 'Route crafting failed');
        setPhase('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [phase, destination, destName]);

  // — live reroute when off-route —
  const onNeedReroute = useCallback(
    (from: LatLng) => {
      if (rerouting) return;
      setRerouting(true);
      play('reroute');
      (async () => {
        try {
          const r = await fetchRoute(from, destination, destName);
          setRoute(r);
        } catch {
          // keep the old route; the engine will ask again on the next fix
        } finally {
          setRerouting(false);
        }
      })();
    },
    [rerouting, destination, destName],
  );

  const nav = useLiveNavigation(route, navigating ? fix : null, onNeedReroute);

  useEffect(() => {
    if (nav?.arrived && !arrivedSoundPlayed.current) {
      arrivedSoundPlayed.current = true;
      play('route-done');
    }
  }, [nav?.arrived]);

  // ——— loading / error phases ———
  if (phase === 'locating') {
    return <LoadingScreen messages={['Finding your position…', 'Exploring nearby area…']} />;
  }
  if (phase === 'routing') {
    return <LoadingScreen messages={['Crafting route…', 'Generating chunks…', 'Loading terrain…']} />;
  }
  if (phase === 'error' || !route) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.charcoal,
          alignItems: 'center',
          justifyContent: 'center',
          padding: spacing.xl,
        }}
      >
        <PixelPanel texture="stone" style={{ maxWidth: 420, width: '100%' }}>
          <PixelText variant="label" color={colors.dangerRed} align="center">
            ROUTE CRAFTING FAILED
          </PixelText>
          <PixelText variant="bodySM" color={colors.textDim} align="center" style={{ marginTop: spacing.md }}>
            {errorMsg}
          </PixelText>
          <BlockButton title="TRY AGAIN" style={{ marginTop: spacing.lg }} onPress={() => setPhase('routing')} />
          <BlockButton
            title="BACK"
            tone="wood"
            style={{ marginTop: spacing.md }}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          />
        </PixelPanel>
      </View>
    );
  }

  // ——— ready: the parchment map ———
  const step = nav ? route.steps[nav.stepIndex] : route.steps[0];
  const remaining = nav ? nav.remainingMeters : route.distanceMeters;
  const remainingSecs = nav ? nav.remainingSeconds : route.durationSeconds;
  const progress = 1 - remaining / Math.max(1, route.distanceMeters);

  return (
    <View style={{ flex: 1, backgroundColor: colors.dirtDark }}>
      {/* ——— map area (parchment held inside a wooden frame) ——— */}
      <View
        style={{ flex: 1, margin: spacing.sm, marginTop: insets.top + spacing.sm }}
        onLayout={(e) =>
          setMapSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })
        }
      >
        <View
          style={{
            flex: 1,
            borderWidth: 6,
            borderColor: colors.dirt,
            backgroundColor: colors.parchment,
          }}
        >
          {mapSize.w > 0 && (
            <ParchmentMap
              route={route}
              player={nav ? nav.snapped : route.coords[0]}
              heading={fix?.heading ?? 0}
              destination={destination}
              mode={navigating && !nav?.arrived ? 'follow' : 'overview'}
              width={mapSize.w - 12}
              height={mapSize.h - 12}
            />
          )}
        </View>

        {/* destination banner strip over the map */}
        <View style={{ position: 'absolute', top: spacing.sm, left: spacing.sm, right: spacing.sm }}>
          <PixelPanel texture="stone" padded={false}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
              }}
            >
              <PixelText variant="label" color={colors.routeGold} numberOfLines={1} style={{ flex: 1 }}>
                {destName.toUpperCase()}
              </PixelText>
              <PixelText variant="bodySM" color={colors.textDim}>
                {formatDistance(remaining)} · {formatDuration(remainingSecs)}
              </PixelText>
            </View>
          </PixelPanel>
        </View>

        {/* reroute overlay */}
        {rerouting && (
          <View
            style={{
              position: 'absolute',
              top: '42%',
              left: spacing.xl,
              right: spacing.xl,
              alignItems: 'center',
            }}
          >
            <PixelPanel texture="stone">
              <PixelText variant="label" color={colors.routeGold} align="center">
                Recalculating path…
              </PixelText>
            </PixelPanel>
          </View>
        )}
      </View>

      {/* ——— bottom HUD ——— */}
      <View
        style={{
          padding: spacing.sm,
          paddingBottom: insets.bottom + spacing.sm,
          backgroundColor: colors.panelStoneDark,
          borderTopWidth: 3,
          borderTopColor: '#141414',
        }}
      >
        {nav?.arrived ? (
          <PixelPanel texture="stone">
            <PixelText variant="title" color={colors.xpGreen} align="center">
              YOU HAVE ARRIVED!
            </PixelText>
            <PixelText variant="bodySM" color={colors.textDim} align="center" style={{ marginTop: spacing.xs }}>
              Quest complete: {destName}
            </PixelText>
            <BlockButton
              title="DONE"
              tone="gold"
              style={{ marginTop: spacing.md }}
              onPress={() => router.replace('/')}
            />
          </PixelPanel>
        ) : navigating ? (
          <PixelPanel texture="stone" padded={false}>
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.md }}>
              <TurnArrow kind={step.kind} size={52} />
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <PixelText variant="bodyLG" numberOfLines={2}>
                  {step.instruction}
                </PixelText>
                <PixelText variant="distance" color={colors.routeGold}>
                  {formatDistance(nav ? nav.distanceToManeuver : 0)}
                </PixelText>
              </View>
              <BlockButton
                title="END"
                tone="danger"
                compact
                onPress={() => {
                  setNavigating(false);
                  play('button-click');
                }}
              />
            </View>
            <View style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.md }}>
              <XPProgressBar progress={progress} height={10} />
            </View>
          </PixelPanel>
        ) : (
          <PixelPanel texture="stone">
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1, marginRight: spacing.md }}>
                <PixelText variant="bodySM" color={colors.textDim}>
                  {source === 'demo'
                    ? 'NO GPS SIGNAL — DEMO DRIVE READY'
                    : 'GPS LOCKED — READY TO SET OUT'}
                </PixelText>
              </View>
              <BlockButton
                title="BEGIN QUEST"
                tone="gold"
                onPress={() => {
                  arrivedSoundPlayed.current = false;
                  setNavigating(true);
                  play('map-scribble');
                }}
              />
            </View>
          </PixelPanel>
        )}
      </View>
    </View>
  );
}
