import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { Pin, WildfirePoint } from "../../backend.d";
import {
  BANGKOK_COMMUNITIES,
  BANGKOK_DENSITY_COLORS,
  BANGKOK_DENSITY_LABELS,
  type BangkokCommunity,
  generateLayerCanvas,
} from "../../lib/textureGenerator";
import type { ActiveLayer, LayerId, ToolMode } from "../../types/globe";
import type { HeatRiskResult } from "../../types/heatRisk";

// Pre-rendered overlay textures (equirectangular projection, 2048x1024)
const LAYER_TEXTURES: Partial<Record<LayerId, string>> = {
  terrain: "/assets/generated/overlay-terrain.dim_2048x1024.jpg",
  elevation: "/assets/generated/overlay-elevation.dim_2048x1024.jpg",
  temperature: "/assets/generated/overlay-temperature.dim_2048x1024.jpg",
  rainfall: "/assets/generated/overlay-rainfall.dim_2048x1024.jpg",
  population: "/assets/generated/overlay-population.dim_2048x1024.jpg",
  vegetation: "/assets/generated/overlay-vegetation.dim_2048x1024.jpg",
  gdp: "/assets/generated/overlay-gdp.dim_2048x1024.jpg",
  lights: "/assets/generated/overlay-lights.dim_2048x1024.jpg",
};

// Cache loaded textures by URL
const textureCache = new Map<string, THREE.Texture>();

// Cache procedural CanvasTextures by layerId
const layerTextureCache = new Map<string, THREE.Texture>();

function loadTexture(url: string): Promise<THREE.Texture> {
  if (textureCache.has(url)) {
    return Promise.resolve(textureCache.get(url)!);
  }
  return new Promise((resolve) => {
    new THREE.TextureLoader().load(url, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      textureCache.set(url, tex);
      resolve(tex);
    });
  });
}

function useLayerTexture(layerId: LayerId): THREE.Texture | null {
  const [texture, setTexture] = useState<THREE.Texture | null>(() => {
    const cached = layerTextureCache.get(layerId);
    return cached ?? null;
  });

  useEffect(() => {
    let cancelled = false;

    const cached = layerTextureCache.get(layerId);
    if (cached) {
      setTexture(cached);
      return;
    }

    const imageUrl = LAYER_TEXTURES[layerId];
    if (imageUrl) {
      loadTexture(imageUrl).then((tex) => {
        if (cancelled) return;
        layerTextureCache.set(layerId, tex);
        setTexture(tex);
      });
    } else {
      const canvas = generateLayerCanvas(layerId, 1024, 512);
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      layerTextureCache.set(layerId, tex);
      setTexture(tex);
    }

    return () => {
      cancelled = true;
    };
  }, [layerId]);

  return texture;
}

// --- Stars ---
function StarField() {
  const [geometry] = useState(() => {
    const geo = new THREE.BufferGeometry();
    const count = 2000;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 80 + Math.random() * 20;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geo;
  });

  return (
    <points geometry={geometry}>
      <pointsMaterial
        color="#ffffff"
        size={0.15}
        sizeAttenuation
        transparent
        opacity={0.8}
      />
    </points>
  );
}

// --- Atmosphere glow ---
function Atmosphere() {
  return (
    <mesh scale={[1.08, 1.08, 1.08]}>
      <sphereGeometry args={[2, 64, 64]} />
      <meshBasicMaterial
        color="#67D5FF"
        transparent
        opacity={0.06}
        side={THREE.BackSide}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

function AtmosphereOuter() {
  return (
    <mesh scale={[1.15, 1.15, 1.15]}>
      <sphereGeometry args={[2, 64, 64]} />
      <meshBasicMaterial
        color="#3A87FF"
        transparent
        opacity={0.025}
        side={THREE.BackSide}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

// --- Pin marker ---
interface PinMarkerProps {
  pin: Pin;
  isSelected: boolean;
  onClick: (pin: Pin) => void;
}

function PinMarker({ pin, isSelected, onClick }: PinMarkerProps) {
  const ref = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  const position = useMemo(() => {
    const lat = (pin.latitude * Math.PI) / 180;
    const lng = (pin.longitude * Math.PI) / 180;
    const r = 2.05;
    return new THREE.Vector3(
      r * Math.cos(lat) * Math.cos(lng),
      r * Math.sin(lat),
      -r * Math.cos(lat) * Math.sin(lng),
    );
  }, [pin.latitude, pin.longitude]);

  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.5;
    }
  });

  const color = isSelected ? "#67D5FF" : hovered ? "#FFFDE7" : "#FF5C7A";

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: Three.js 3D object, not a DOM element
    <group
      ref={ref}
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        onClick(pin);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "default";
      }}
    >
      <mesh position={[0, 0.08, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.04, 0.12, 8]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.6}
        />
      </mesh>
      <mesh position={[0, 0.16, 0]}>
        <sphereGeometry args={[0.04, 12, 12]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={1.0}
        />
      </mesh>
      {(isSelected || hovered) && (
        <mesh position={[0, 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.06, 0.1, 24]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.5}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}
    </group>
  );
}

// --- Heat-risk marker (pulsing ring + radius circle on the globe surface) ---
interface HeatRiskMarkerProps {
  center: { lat: number; lng: number };
  radiusMeters: number;
  result: HeatRiskResult | null;
}

// Globe radius used elsewhere in this scene (matches Globe/OverlayMesh).
const GLOBE_R = 2;

// Convert a lat/lng to a 3D position on the globe surface, matching the
// convention used by PinMarker (negative z for east longitudes).
function latLngToVec3(lat: number, lng: number, r: number): THREE.Vector3 {
  const latRad = (lat * Math.PI) / 180;
  const lngRad = (lng * Math.PI) / 180;
  return new THREE.Vector3(
    r * Math.cos(latRad) * Math.cos(lngRad),
    r * Math.sin(latRad),
    -r * Math.cos(latRad) * Math.sin(lngRad),
  );
}

// Pick a marker color from the Thai risk level so the pulse matches the
// computed severity.
function riskColor(result: HeatRiskResult | null): string {
  if (!result) return "#FF8A3D";
  switch (result.riskLevel) {
    case "ต่ำ":
      return "#4ADE80";
    case "ปานกลาง":
      return "#FACC15";
    case "สูง":
      return "#FB923C";
    case "วิกฤต":
      return "#EF4444";
    default:
      return "#FF8A3D";
  }
}

function HeatRiskMarker({ center, radiusMeters, result }: HeatRiskMarkerProps) {
  const pulseRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  // Surface position of the analysis center.
  const surfacePos = useMemo(
    () => latLngToVec3(center.lat, center.lng, GLOBE_R + 0.01),
    [center.lat, center.lng],
  );

  // Orient the marker so its local +Z points outward from the globe center.
  // This makes the ring geometry lie tangent to the sphere at that point.
  const quaternion = useMemo(() => {
    const outward = surfacePos.clone().normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      outward,
    );
    return q;
  }, [surfacePos]);

  // Convert the analysis radius (meters) to a scene-space ring radius.
  // Earth radius ≈ 6,371,000 m; globe radius = GLOBE_R scene units.
  const ringRadius = useMemo(() => {
    const earthRadiusM = 6_371_000;
    const arcMeters = radiusMeters; // small-angle approximation ok for ≤ few km
    const scenePerMeter = GLOBE_R / earthRadiusM;
    return Math.max(0.02, arcMeters * scenePerMeter);
  }, [radiusMeters]);

  const color = riskColor(result);

  // Animate the pulse ring scale (heat-pulse effect) using useFrame so it
  // stays smooth and respects the render loop.
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (pulseRef.current) {
      const scale = 1 + 0.35 * (0.5 + 0.5 * Math.sin(t * 2.2));
      pulseRef.current.scale.set(scale, scale, scale);
      const mat = pulseRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.55 - 0.35 * (0.5 + 0.5 * Math.sin(t * 2.2));
    }
    if (ringRef.current) {
      // Subtle breathing on the radius circle to draw the eye.
      const breath = 1 + 0.02 * Math.sin(t * 1.5);
      ringRef.current.scale.set(breath, breath, 1);
    }
  });

  return (
    <group position={surfacePos} quaternion={quaternion}>
      {/* Center dot */}
      <mesh>
        <sphereGeometry args={[0.03, 16, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>

      {/* Pulsing ring (heat-pulse animation) */}
      <mesh ref={pulseRef} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.05, 0.08, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Analysis radius circle on the globe surface */}
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[ringRadius - 0.005, ringRadius, 64]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.35}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

// --- Wildfire marker (glowing dot sized by brightness) ---
interface WildfireMarkerProps {
  fire: WildfirePoint;
  onClick: (fire: WildfirePoint) => void;
}

function WildfireMarker({ fire, onClick }: WildfireMarkerProps) {
  const [hovered, setHovered] = useState(false);
  const ref = useRef<THREE.Mesh>(null);

  const position = useMemo(
    () => latLngToVec3(fire.lat, fire.lng, GLOBE_R + 0.015),
    [fire.lat, fire.lng],
  );

  // Size by brightness: 300K → 0.025, 500K → 0.06.
  const size = useMemo(() => {
    const t = Math.min(1, Math.max(0, (fire.brightness - 290) / 220));
    return 0.025 + t * 0.035;
  }, [fire.brightness]);

  // Color by brightness: orange (low) → red (high).
  const color = useMemo(() => {
    const t = Math.min(1, Math.max(0, (fire.brightness - 300) / 200));
    return new THREE.Color().lerpColors(
      new THREE.Color("#FB923C"),
      new THREE.Color("#DC2626"),
      t,
    );
  }, [fire.brightness]);

  // Pulsing glow.
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    const pulse = 1 + 0.25 * (0.5 + 0.5 * Math.sin(t * 3 + fire.lat));
    ref.current.scale.setScalar(pulse);
  });

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: Three.js 3D object
    <mesh
      ref={ref}
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        onClick(fire);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "default";
      }}
    >
      <sphereGeometry args={[size, 12, 12]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={hovered ? 1 : 0.85}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

// --- Bangkok dense-community marker ---
// Renders a clickable pin for each BANGKOK_COMMUNITIES entry when the
// bangkok_density overlay is active. Clicking selects the community and
// surfaces its name + density level through the onSelect callback, which
// the parent renders as an HTML popup anchored to the globe canvas.
interface BangkokCommunityMarkerProps {
  community: BangkokCommunity;
  isSelected: boolean;
  onSelect: (community: BangkokCommunity) => void;
}

function BangkokCommunityMarker({
  community,
  isSelected,
  onSelect,
}: BangkokCommunityMarkerProps) {
  const [hovered, setHovered] = useState(false);
  const ref = useRef<THREE.Mesh>(null);

  const position = useMemo(
    () => latLngToVec3(community.lat, community.lng, GLOBE_R + 0.02),
    [community.lat, community.lng],
  );

  const color = BANGKOK_DENSITY_COLORS[community.density];

  // Size by density: high = largest, low = smallest.
  const size = useMemo(() => {
    switch (community.density) {
      case "high":
        return 0.045;
      case "medium":
        return 0.035;
      default:
        return 0.028;
    }
  }, [community.density]);

  // Gentle pulse so the markers read as live hotspots.
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    const pulse = 1 + 0.18 * (0.5 + 0.5 * Math.sin(t * 2 + community.lat));
    ref.current.scale.setScalar(pulse);
  });

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: Three.js 3D object
    <mesh
      ref={ref}
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(community);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "default";
      }}
    >
      <sphereGeometry args={[size, 16, 16]} />
      <meshStandardMaterial
        color={color}
        transparent
        opacity={isSelected || hovered ? 1 : 0.85}
        emissive={color}
        emissiveIntensity={0.6}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
      {(isSelected || hovered) && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[size * 1.6, size * 2.2, 32]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.5}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      )}
    </mesh>
  );
}

// --- Camera fly-to controller ---
// Imperatively animates the camera + OrbitControls target to a target lat/lng.
// Watches a `flyTarget` prop (lat/lng + a nonce that changes per request) and
// tweens over ~1.2s.
interface FlyToControllerProps {
  flyTarget: { lat: number; lng: number; nonce: number } | null;
}

function FlyToController({ flyTarget }: FlyToControllerProps) {
  const { camera } = useThree();
  const controlsRef = useRef<{
    target: THREE.Vector3;
    update: () => void;
  } | null>(null);
  const animating = useRef(false);
  const startState = useRef<{
    fromPos: THREE.Vector3;
    fromTarget: THREE.Vector3;
    toPos: THREE.Vector3;
    toTarget: THREE.Vector3;
    startTime: number;
  } | null>(null);

  // Grab the OrbitControls instance via scene traversal. OrbitControls from
  // drei attaches to the camera; we read its target through the controls ref
  // exposed on the camera userData by drei's OrbitControls component.
  useEffect(() => {
    // drei's OrbitControls stores itself on camera.userData.controls.
    const tryAttach = () => {
      const controls = (
        camera as THREE.Camera & {
          userData?: { controls?: unknown };
        }
      ).userData?.controls as
        | { target: THREE.Vector3; update: () => void }
        | undefined;
      if (controls) controlsRef.current = controls;
    };
    tryAttach();
    const id = window.setInterval(tryAttach, 200);
    return () => window.clearInterval(id);
  }, [camera]);

  useEffect(() => {
    if (!flyTarget) return;
    const target = latLngToVec3(flyTarget.lat, flyTarget.lng, GLOBE_R);
    // Place the camera along the outward normal, pulled back to min distance.
    const outward = target.clone().normalize();
    const toPos = outward.multiplyScalar(4.2);
    const fromTarget =
      controlsRef.current?.target ?? new THREE.Vector3(0, 0, 0);
    startState.current = {
      fromPos: camera.position.clone(),
      fromTarget: fromTarget.clone(),
      toPos,
      toTarget: target,
      startTime: performance.now(),
    };
    animating.current = true;
  }, [flyTarget, camera]);

  useFrame(() => {
    if (!animating.current || !startState.current) return;
    const s = startState.current;
    const elapsed = performance.now() - s.startTime;
    const duration = 1200;
    const t = Math.min(1, elapsed / duration);
    // easeInOutCubic
    const eased = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
    camera.position.lerpVectors(s.fromPos, s.toPos, eased);
    if (controlsRef.current) {
      controlsRef.current.target.lerpVectors(s.fromTarget, s.toTarget, eased);
      controlsRef.current.update();
    }
    if (t >= 1) animating.current = false;
  });

  return null;
}

// --- Single overlay mesh ---
interface OverlayMeshProps {
  layerId: LayerId;
  opacity: number;
  index: number;
  rotation: React.MutableRefObject<number>;
}

function OverlayMesh({ layerId, opacity, index, rotation }: OverlayMeshProps) {
  const texture = useLayerTexture(layerId);
  const meshRef = useRef<THREE.Mesh>(null);

  // Keep in sync with globe rotation
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y = rotation.current;
    }
  });

  if (!texture) return null;

  const radius = 2.001 + index * 0.001;

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[radius, 96, 96]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={opacity}
        blending={THREE.NormalBlending}
        depthWrite={false}
        depthTest={false}
      />
    </mesh>
  );
}

// --- Globe base sphere ---
interface GlobeProps {
  mode: ToolMode;
  onGlobeClick: (lat: number, lng: number) => void;
  rotationRef: React.MutableRefObject<number>;
}

function Globe({ mode, onGlobeClick, rotationRef }: GlobeProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const isRotating = useRef(true);
  const lastInteraction = useRef(0);

  useFrame((_, delta) => {
    if (meshRef.current) {
      const now = Date.now();
      if (now - lastInteraction.current > 3000) {
        isRotating.current = true;
      }
      if (isRotating.current) {
        meshRef.current.rotation.y += delta * 0.05;
        rotationRef.current = meshRef.current.rotation.y;
      }
    }
  });

  const handleClick = useCallback(
    (e: any) => {
      if (mode !== "pin" && mode !== "heat-risk" && mode !== "temperature")
        return;
      const point = e.point as THREE.Vector3;
      const normalized = point.clone().normalize();
      const lat = (Math.asin(normalized.y) * 180) / Math.PI;
      const lng = (Math.atan2(-normalized.z, normalized.x) * 180) / Math.PI;
      onGlobeClick(lat, lng);
    },
    [mode, onGlobeClick],
  );

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: Three.js 3D mesh, not a DOM element
    <mesh
      ref={meshRef}
      onClick={handleClick}
      onPointerDown={() => {
        isRotating.current = false;
        lastInteraction.current = Date.now();
      }}
    >
      <sphereGeometry args={[2, 96, 96]} />
      <meshPhongMaterial
        color={new THREE.Color(0xf2ede4)}
        specular={new THREE.Color(0xffffff)}
        shininess={30}
      />
    </mesh>
  );
}

// --- Inner canvas content (needs to be inside Canvas) ---
interface SceneContentProps {
  activeLayers: ActiveLayer[];
  pins: Pin[];
  selectedPin: Pin | null;
  mode: ToolMode;
  onPinClick: (pin: Pin) => void;
  onDropPin: (lat: number, lng: number) => void;
  heatRiskCenter: { lat: number; lng: number } | null;
  heatRiskRadius: number;
  heatRiskResult: HeatRiskResult | null;
  flyTarget: { lat: number; lng: number; nonce: number } | null;
  wildfirePoints: WildfirePoint[];
  showWildfireLayer: boolean;
  onWildfireClick: (fire: WildfirePoint) => void;
  // Bangkok dense-community overlay. When `showBangkokDensity` is true the
  // scene renders a BangkokCommunityMarker for each BANGKOK_COMMUNITIES entry.
  // `selectedCommunity` highlights the active marker; `onCommunitySelect`
  // bubbles the click up to the parent so it can show an HTML popup.
  showBangkokDensity: boolean;
  selectedCommunity: BangkokCommunity | null;
  onCommunitySelect: (community: BangkokCommunity) => void;
}

function SceneContent({
  activeLayers,
  pins,
  selectedPin,
  mode,
  onPinClick,
  onDropPin,
  heatRiskCenter,
  heatRiskRadius,
  heatRiskResult,
  flyTarget,
  wildfirePoints,
  showWildfireLayer,
  onWildfireClick,
  showBangkokDensity,
  selectedCommunity,
  onCommunitySelect,
}: SceneContentProps) {
  const rotationRef = useRef(0);

  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 3, 5]} intensity={1.2} color="#ffffff" />
      <directionalLight
        position={[-5, -2, -3]}
        intensity={0.2}
        color="#4488ff"
      />
      <StarField />
      <Globe mode={mode} onGlobeClick={onDropPin} rotationRef={rotationRef} />
      {/* Overlay layers stacked on top of globe */}
      {activeLayers.map((layer, index) => (
        <OverlayMesh
          key={layer.id}
          layerId={layer.id}
          opacity={layer.opacity}
          index={index}
          rotation={rotationRef}
        />
      ))}
      <Atmosphere />
      <AtmosphereOuter />
      {pins.map((pin) => (
        <PinMarker
          key={pin.id.toString()}
          pin={pin}
          isSelected={selectedPin?.id === pin.id}
          onClick={onPinClick}
        />
      ))}
      {heatRiskCenter && (
        <HeatRiskMarker
          center={heatRiskCenter}
          radiusMeters={heatRiskRadius}
          result={heatRiskResult}
        />
      )}
      {showWildfireLayer &&
        wildfirePoints.map((fire, i) => (
          <WildfireMarker
            key={`${fire.lat},${fire.lng},${fire.acqDate},${i}`}
            fire={fire}
            onClick={onWildfireClick}
          />
        ))}
      {showBangkokDensity &&
        BANGKOK_COMMUNITIES.map((community) => (
          <BangkokCommunityMarker
            key={community.name}
            community={community}
            isSelected={selectedCommunity?.name === community.name}
            onSelect={onCommunitySelect}
          />
        ))}
      <FlyToController flyTarget={flyTarget} />
      <OrbitControls
        enablePan={mode === "pan"}
        enableZoom={
          mode === "zoom" ||
          mode === "globe" ||
          mode === "heat-risk" ||
          mode === "temperature"
        }
        enableRotate={mode !== "pin"}
        minDistance={3}
        maxDistance={12}
        autoRotate={false}
        dampingFactor={0.05}
        enableDamping
      />
    </>
  );
}

// --- Main Scene ---
interface GlobeSceneProps {
  activeLayers: ActiveLayer[];
  pins: Pin[];
  selectedPin: Pin | null;
  mode: ToolMode;
  onPinClick: (pin: Pin) => void;
  onDropPin: (lat: number, lng: number) => void;
  heatRiskCenter: { lat: number; lng: number } | null;
  heatRiskRadius: number;
  heatRiskResult: HeatRiskResult | null;
  flyTarget: { lat: number; lng: number; nonce: number } | null;
  wildfirePoints: WildfirePoint[];
  showWildfireLayer: boolean;
  onWildfireClick: (fire: WildfirePoint) => void;
  // Bangkok dense-community overlay props — forwarded to SceneContent which
  // renders the BangkokCommunityMarker instances.
  showBangkokDensity: boolean;
  selectedCommunity: BangkokCommunity | null;
  onCommunitySelect: (community: BangkokCommunity) => void;
}

export function GlobeScene({
  activeLayers,
  pins,
  selectedPin,
  mode,
  onPinClick,
  onDropPin,
  heatRiskCenter,
  heatRiskRadius,
  heatRiskResult,
  flyTarget,
  wildfirePoints,
  showWildfireLayer,
  onWildfireClick,
  showBangkokDensity,
  selectedCommunity,
  onCommunitySelect,
}: GlobeSceneProps) {
  return (
    <Canvas
      camera={{ position: [0, 0, 6], fov: 45 }}
      style={{ background: "transparent" }}
      gl={{ antialias: true, alpha: true }}
    >
      <SceneContent
        activeLayers={activeLayers}
        pins={pins}
        selectedPin={selectedPin}
        mode={mode}
        onPinClick={onPinClick}
        onDropPin={onDropPin}
        heatRiskCenter={heatRiskCenter}
        heatRiskRadius={heatRiskRadius}
        heatRiskResult={heatRiskResult}
        flyTarget={flyTarget}
        wildfirePoints={wildfirePoints}
        showWildfireLayer={showWildfireLayer}
        onWildfireClick={onWildfireClick}
        showBangkokDensity={showBangkokDensity}
        selectedCommunity={selectedCommunity}
        onCommunitySelect={onCommunitySelect}
      />
    </Canvas>
  );
}
