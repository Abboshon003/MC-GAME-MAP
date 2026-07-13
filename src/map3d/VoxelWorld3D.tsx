import React, { useCallback, useEffect, useRef } from 'react';
import { View } from 'react-native';
import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl';
import * as THREE from 'three';
import type { LatLng, Route } from '@/nav/types';
import type { VoxelGrid } from '@/map/voxelize';
import type { WorldData } from '@/map/worldData';
import type { Daylight } from '@/map/daylight';
import type { MapCamera } from '@/map/projection';
import {
  buildDestination,
  buildPlayer,
  buildRoute,
  buildWorld,
} from './buildScene';
import { makeOrigin, toScene, type SceneOrigin } from './geo3d';

/** Screen-space projector the overlay layer uses to pin labels to the world. */
export interface MapProjector {
  project(p: LatLng): { x: number; y: number; visible: boolean };
}

export interface VoxelWorld3DProps {
  world: VoxelGrid | null;
  features: WorldData | null;
  route: Route | null;
  /** Shared 2D camera (center + mercator zoom) — drives the iso framing, so
   * pan/pinch gestures and follow/fit logic live in one place (MapHub). */
  camera: MapCamera;
  player: LatLng | null;
  heading: number;
  destination: LatLng | null;
  daylight: Daylight;
  width: number;
  height: number;
  /** Fired once the GL context is live (or when the camera moves) so the
   * overlay can (re)project its pins. */
  onCameraChange?: (projector: MapProjector) => void;
  /** GL failed to initialize — caller should fall back to the SVG map. */
  onFail?: () => void;
}

const ISO_AZIMUTH = Math.PI / 4;      // 45° — streets read diagonally
const ISO_ELEVATION = (55 * Math.PI) / 180;
const CAM_DIST = 900;

/**
 * The isometric voxel world: real OSM terrain/buildings/trees rendered as a
 * tilted Minecraft-style 3D scene with hard directional shadows.
 */
export function VoxelWorld3D(props: VoxelWorld3DProps) {
  const propsRef = useRef(props);
  propsRef.current = props;

  const stateRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.OrthographicCamera;
    sun: THREE.DirectionalLight;
    ambient: THREE.AmbientLight;
    gl: ExpoWebGLRenderingContext;
    worldGroup: THREE.Group | null;
    worldKey: unknown;
    origin: SceneOrigin | null;
    routeGroup: THREE.Group | null;
    routeKey: unknown;
    playerObj: THREE.Group;
    destObj: THREE.Group;
    raf: number;
  } | null>(null);

  const notifyCamera = useCallback(() => {
    const s = stateRef.current;
    const p = propsRef.current;
    if (!s || !p.onCameraChange) return;
    const v = new THREE.Vector3();
    p.onCameraChange({
      project(pt: LatLng) {
        const o = s.origin ?? makeOrigin(pt);
        const sc = toScene(pt, o);
        v.set(sc.x, 4, sc.z).project(s.camera);
        return {
          x: (v.x * 0.5 + 0.5) * propsRef.current.width,
          y: (1 - (v.y * 0.5 + 0.5)) * propsRef.current.height,
          visible: v.z < 1 && Math.abs(v.x) <= 1.15 && Math.abs(v.y) <= 1.15,
        };
      },
    });
  }, []);

  const onContextCreate = useCallback((gl: ExpoWebGLRenderingContext) => {
    try {
      const width = gl.drawingBufferWidth;
      const height = gl.drawingBufferHeight;
      // three expects a canvas-ish object; expo-gl provides only the context
      const canvasShim = {
        width,
        height,
        clientWidth: width,
        clientHeight: height,
        style: {},
        addEventListener() {},
        removeEventListener() {},
        getContext: () => gl,
      };
      const renderer = new THREE.WebGLRenderer({
        context: gl as unknown as WebGL2RenderingContext,
        canvas: canvasShim as unknown as HTMLCanvasElement,
        antialias: false,
        powerPreference: 'default',
      });
      renderer.setPixelRatio(1);
      renderer.setSize(width, height, false);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.BasicShadowMap; // hard blocky shadows

      const scene = new THREE.Scene();
      const aspect = width / height;
      const halfH = 240;
      const camera = new THREE.OrthographicCamera(
        -halfH * aspect, halfH * aspect, halfH, -halfH, 1, 4000,
      );

      const ambient = new THREE.AmbientLight('#FFFFFF', 0.85);
      const sun = new THREE.DirectionalLight('#FFF3D6', 1.9);
      sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
      sun.shadow.camera.left = -420;
      sun.shadow.camera.right = 420;
      sun.shadow.camera.top = 420;
      sun.shadow.camera.bottom = -420;
      sun.shadow.camera.far = 2500;
      scene.add(ambient, sun, sun.target);

      const playerObj = buildPlayer();
      const destObj = buildDestination();
      destObj.visible = false;
      playerObj.visible = false;
      scene.add(playerObj, destObj);

      stateRef.current = {
        renderer, scene, camera, sun, ambient, gl,
        worldGroup: null, worldKey: null, origin: null,
        routeGroup: null, routeKey: null,
        playerObj, destObj, raf: 0,
      };

      const loop = () => {
        const s = stateRef.current;
        if (!s) return;
        s.raf = requestAnimationFrame(loop);
        syncScene();
        s.renderer.render(s.scene, s.camera);
        s.gl.endFrameEXP?.();
      };
      loop();
      notifyCamera();
    } catch (e) {
      console.warn('[map3d] GL init failed', e);
      propsRef.current.onFail?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Reconcile scene graph with the latest props (cheap; runs per frame). */
  const syncScene = useCallback(() => {
    const s = stateRef.current;
    if (!s) return;
    const p = propsRef.current;

    // — static world —
    if (p.world && p.features && s.worldKey !== p.world) {
      if (s.worldGroup) s.scene.remove(s.worldGroup);
      const built = buildWorld(p.world, p.features);
      s.worldGroup = built.group;
      s.origin = built.origin;
      s.worldKey = p.world;
      s.scene.add(built.group);
      if (s.routeKey) s.routeKey = null; // re-anchor route to new origin
      notifyCamera();
    }
    if (!s.origin) return;

    // — route —
    if (p.route !== s.routeKey) {
      if (s.routeGroup) s.scene.remove(s.routeGroup);
      s.routeGroup = p.route ? buildRoute(p.route, s.origin) : null;
      if (s.routeGroup) s.scene.add(s.routeGroup);
      s.routeKey = p.route;
    }

    // — player & destination —
    if (p.player) {
      const c = toScene(p.player, s.origin);
      s.playerObj.position.set(c.x, 0, c.z);
      s.playerObj.rotation.y = (-p.heading * Math.PI) / 180;
      s.playerObj.visible = true;
    } else s.playerObj.visible = false;
    if (p.destination) {
      const c = toScene(p.destination, s.origin);
      s.destObj.position.set(c.x, 0, c.z);
      s.destObj.visible = true;
    } else s.destObj.visible = false;

    // — daylight grade —
    const night = p.daylight.label === 'NIGHT';
    const dusk = p.daylight.label === 'DUSK' || p.daylight.label === 'DAWN';
    s.ambient.intensity = night ? 0.68 : dusk ? 0.8 : 0.95;
    s.sun.intensity = night ? 0.95 : dusk ? 1.6 : 2.0;
    s.sun.color.set(night ? '#A9BDE0' : dusk ? '#F2B26B' : '#FFF3D6');
    s.scene.background = new THREE.Color(night ? '#18223A' : dusk ? '#3E3428' : '#3E5A33');

    // — camera: framed by the shared MapCamera (center + mercator zoom) —
    const target = toScene(p.camera.center, s.origin);
    const metersPerPx =
      (156543.03392 * Math.cos((p.camera.center.lat * Math.PI) / 180)) / 2 ** p.camera.zoom;
    const halfH = Math.max(60, (p.height / 2) * metersPerPx);
    const aspect = p.width / Math.max(1, p.height);
    s.camera.left = -halfH * aspect;
    s.camera.right = halfH * aspect;
    s.camera.top = halfH;
    s.camera.bottom = -halfH;
    const dx = Math.sin(ISO_AZIMUTH) * Math.cos(ISO_ELEVATION) * CAM_DIST;
    const dy = Math.sin(ISO_ELEVATION) * CAM_DIST;
    const dz = Math.cos(ISO_AZIMUTH) * Math.cos(ISO_ELEVATION) * CAM_DIST;
    s.camera.position.set(target.x + dx, dy, target.z + dz);
    s.camera.lookAt(target.x, 0, target.z);
    s.camera.updateProjectionMatrix();

    // — sun follows the camera target so shadows stay crisp nearby —
    s.sun.position.set(target.x - 260, 420, target.z - 160);
    s.sun.target.position.set(target.x, 0, target.z);
  }, [notifyCamera]);

  // Re-project overlay pins whenever inputs that move the camera change.
  useEffect(() => {
    notifyCamera();
  }, [props.camera.center.lat, props.camera.center.lon, props.camera.zoom, props.width, props.height, notifyCamera]);

  useEffect(
    () => () => {
      const s = stateRef.current;
      if (s) cancelAnimationFrame(s.raf);
      stateRef.current = null;
    },
    [],
  );

  return (
    <View style={{ width: props.width, height: props.height, overflow: 'hidden' }}>
      <GLView
        key={`${Math.round(props.width)}x${Math.round(props.height)}`}
        style={{ width: props.width, height: props.height }}
        onContextCreate={onContextCreate}
      />
    </View>
  );
}
