"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { HexSlot, HexZone } from "@/data/hexZones";
import { getRowPatternPositions } from "./hexMath";

interface HexZoneThreeViewProps {
  zone: HexZone;
  plotSlots: HexSlot[];
  orbitProgress: number;
  selectedPlotIndex: number | null;
  onSelectPlot: (plotIndex: number) => void;
}

const CAMERA_TOP = new THREE.Vector3(0, 430, 0.01);
const CAMERA_ANGLE = new THREE.Vector3(180, 155, 180);
const LOOK_AT = new THREE.Vector3(0, 24, 0);
const scratchCamTop = new THREE.Vector3();
const scratchCamAngle = new THREE.Vector3();
/** Slightly lower focal point on narrow viewports — pulls the hex slab upward in the frame. */
const MOBILE_LOOK_AT = new THREE.Vector3(0, 14, 0);

/**
 * Pull camera back on phones only (`max-width: 639px`). Never use canvas height alone — that
 * broke laptops when the 3D panel was short.
 */
function isNarrowTouchViewport(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(max-width: 639px)").matches;
}

function cameraDistanceMultiplierMobile(width: number, height: number): number {
  const h = Math.max(height, 120);
  const w = Math.max(width, 120);
  const aspect = w / h;
  let m = 1.32;
  if (aspect < 0.42) m += 0.28;
  else if (aspect < 0.52) m += 0.18;
  else if (aspect < 0.62) m += 0.1;
  if (h < 340) m += 0.08;
  return Math.min(m, 1.68);
}

const HEX_RADIUS = 28;
const HEX_HEIGHT = 48;
const SELECTED_PLOT_LIFT = 6;
const ROW_PATTERN = [2, 3, 2, 3, 2] as const;
const DISEASE_PLOT_INDEX = 6; // Plot 7 in one-based numbering.
const DISEASE_SIDE_COLOR = "#dc2626";
const DISEASE_TOP_COLOR = "#fca5a5";
const DISEASE_EDGE_COLOR = "#7f1d1d";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function disposeObject3D(object: THREE.Object3D) {
  const mesh = object as THREE.Mesh;
  if (mesh.geometry) {
    mesh.geometry.dispose();
  }

  const material = mesh.material;
  if (!material) return;

  if (Array.isArray(material)) {
    material.forEach((entry) => entry.dispose());
    return;
  }
  material.dispose();
}

function clearGroup(group: THREE.Group) {
  group.children.forEach((child) => disposeObject3D(child));
  group.clear();
}

export function HexZoneThreeView({ zone, plotSlots, orbitProgress, selectedPlotIndex, onSelectPlot }: HexZoneThreeViewProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const orbitProgressRef = useRef(orbitProgress);
  const onSelectPlotRef = useRef<HexZoneThreeViewProps["onSelectPlot"]>(onSelectPlot);
  const sceneRef = useRef<{
    camera: THREE.PerspectiveCamera;
    scene: THREE.Scene;
    group: THREE.Group;
    plotMeshes: THREE.Mesh[];
    interactiveObjects: THREE.Object3D[];
    renderer: THREE.WebGLRenderer;
    frameId: number | null;
    resizeObserver: ResizeObserver | null;
  } | null>(null);

  useEffect(() => {
    orbitProgressRef.current = orbitProgress;
  }, [orbitProgress]);

  useEffect(() => {
    onSelectPlotRef.current = onSelectPlot;
  }, [onSelectPlot]);

  useEffect(() => {
    if (!mountRef.current) return;
    const mountEl = mountRef.current;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#f4f7f4");
    scene.fog = new THREE.Fog("#f4f7f4", 280, 560);

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 1200);
    camera.position.copy(CAMERA_TOP);
    camera.lookAt(LOOK_AT);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    mountEl.appendChild(renderer.domElement);
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";

    const ambient = new THREE.AmbientLight("#c9dccf", 0.75);
    scene.add(ambient);

    const hemi = new THREE.HemisphereLight("#eaf6ed", "#9eb39f", 0.55);
    hemi.position.set(0, 220, 0);
    scene.add(hemi);

    const key = new THREE.DirectionalLight("#f0fff2", 1.0);
    key.position.set(120, 220, 120);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 480;
    key.shadow.camera.left = -200;
    key.shadow.camera.right = 200;
    key.shadow.camera.top = 200;
    key.shadow.camera.bottom = -200;
    scene.add(key);

    const fill = new THREE.DirectionalLight("#c7dfce", 0.4);
    fill.position.set(-140, 100, -100);
    scene.add(fill);

    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(170, 64),
      new THREE.MeshStandardMaterial({
        color: "#d9e6da",
        transparent: true,
        opacity: 0.42,
        roughness: 0.96,
        metalness: 0,
      }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    scene.add(ground);

    const group = new THREE.Group();
    group.position.y = 2;
    scene.add(group);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    function pickPlotAt(clientX: number, clientY: number) {
      const state = sceneRef.current;
      if (!state) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(state.interactiveObjects, false);
      if (hits.length === 0) return;
      const hit = hits[0].object as THREE.Mesh;
      const plotIndex = hit.userData.plotIndex as number | undefined;
      if (plotIndex === undefined) return;
      onSelectPlotRef.current(plotIndex);
    }

    function pickPlot(event: MouseEvent) {
      pickPlotAt(event.clientX, event.clientY);
    }

    function pickPlotTouch(event: TouchEvent) {
      if (event.changedTouches.length !== 1) return;
      const t = event.changedTouches[0];
      pickPlotAt(t.clientX, t.clientY);
    }

    function updateHoverCursor(event: MouseEvent) {
      const state = sceneRef.current;
      if (!state) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(state.interactiveObjects, false);
      renderer.domElement.style.cursor = hits.length > 0 ? "pointer" : "default";
    }

    renderer.domElement.addEventListener("click", pickPlot);
    renderer.domElement.addEventListener("touchend", pickPlotTouch, { passive: true });
    renderer.domElement.addEventListener("mousemove", updateHoverCursor);

    const frameTimer = new THREE.Timer();
    frameTimer.connect(document);

    function renderFrame(now: number) {
      frameTimer.update(now);
      const t = frameTimer.getElapsed();
      const p = clamp(orbitProgressRef.current, 0, 1);

      const eased = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      if (!isNarrowTouchViewport()) {
        camera.position.lerpVectors(CAMERA_TOP, CAMERA_ANGLE, eased);
        camera.lookAt(LOOK_AT);
      } else {
        const w = mountEl.clientWidth;
        const h = mountEl.clientHeight;
        const mult = cameraDistanceMultiplierMobile(w, h);
        scratchCamTop.subVectors(CAMERA_TOP, LOOK_AT).multiplyScalar(mult).add(LOOK_AT);
        scratchCamAngle.subVectors(CAMERA_ANGLE, LOOK_AT).multiplyScalar(mult).add(LOOK_AT);
        camera.position.lerpVectors(scratchCamTop, scratchCamAngle, eased);
        camera.lookAt(MOBILE_LOOK_AT);
      }

      group.rotation.y = (1 - eased) * 0.35 + Math.sin(t * 0.6) * 0.02;
      group.position.y = 2 + Math.sin(t * 0.8) * 0.7;

      group.children.forEach((child) => {
        const effectType = child.userData.effectType as string | undefined;
        if (effectType === "infectionRing") {
          const baseScale = child.userData.baseScale as number;
          const phase = child.userData.phase as number;
          const pulse = 1 + Math.sin(t * 3.3 + phase) * 0.12;
          child.scale.setScalar(baseScale * pulse);
          const material = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
          material.opacity = 0.42 + Math.sin(t * 3 + phase) * 0.16;
        }

        if (effectType === "infectionBadge") {
          const baseY = child.userData.baseY as number;
          const phase = child.userData.phase as number;
          child.position.y = baseY + Math.sin(t * 2.6 + phase) * 0.8;
          const material = (child as THREE.Sprite).material as THREE.SpriteMaterial;
          material.opacity = 0.9 + Math.sin(t * 2.2 + phase) * 0.1;
        }

        if (effectType === "infectionLight") {
          const baseIntensity = child.userData.baseIntensity as number;
          const phase = child.userData.phase as number;
          (child as THREE.PointLight).intensity = baseIntensity + Math.sin(t * 2.8 + phase) * 0.35;
        }
      });

      renderer.render(scene, camera);
      if (sceneRef.current) {
        sceneRef.current.frameId = window.requestAnimationFrame(renderFrame);
      }
    }

    function updateSize() {
      const width = mountEl.clientWidth;
      const height = mountEl.clientHeight;
      if (!width || !height) return;
      renderer.setSize(width, height, true);
      camera.aspect = width / height;
      const narrow = isNarrowTouchViewport();
      if (!narrow) {
        camera.fov = 42;
        group.scale.setScalar(1);
      } else {
        const mult = cameraDistanceMultiplierMobile(width, height);
        camera.fov = Math.min(56, 42 + (mult - 1.2) * 38);
        group.scale.setScalar(height < 460 ? 0.88 : 0.92);
      }
      camera.updateProjectionMatrix();
    }

    function onViewportBreakpoint() {
      updateSize();
    }

    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(mountEl);

    const narrowMq = window.matchMedia("(max-width: 639px)");
    narrowMq.addEventListener("change", onViewportBreakpoint);

    sceneRef.current = {
      camera,
      scene,
      group,
      plotMeshes: [],
      interactiveObjects: [],
      renderer,
      frameId: null,
      resizeObserver,
    };
    updateSize();
    sceneRef.current.frameId = window.requestAnimationFrame(renderFrame);

    return () => {
      const state = sceneRef.current;
      if (!state) return;
      if (state.frameId !== null) window.cancelAnimationFrame(state.frameId);
      frameTimer.dispose();
      state.resizeObserver?.disconnect();
      narrowMq.removeEventListener("change", onViewportBreakpoint);
      renderer.domElement.removeEventListener("click", pickPlot);
      renderer.domElement.removeEventListener("touchend", pickPlotTouch);
      renderer.domElement.removeEventListener("mousemove", updateHoverCursor);
      renderer.domElement.style.cursor = "default";
      clearGroup(state.group);
      state.scene.clear();
      state.renderer.dispose();
      if (state.renderer.domElement.parentElement === mountEl) {
        mountEl.removeChild(state.renderer.domElement);
      }
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    const state = sceneRef.current;
    if (!state) return;

    clearGroup(state.group);
    state.plotMeshes = [];
    state.interactiveObjects = [];

    const slotPositions = getRowPatternPositions(0, 0, HEX_RADIUS, ROW_PATTERN).map(({ x, y }) => ({ x, z: y }));

    slotPositions.forEach((slotPosition, index) => {
      const slot = plotSlots[index];
      const isReserve = !slot.crop && slot.genericType === "reserve";
      const isDiseasePlot = index === DISEASE_PLOT_INDEX;
      const height = HEX_HEIGHT;
      const geometry = new THREE.CylinderGeometry(HEX_RADIUS, HEX_RADIUS, height, 6, 1, false);

      const isSelected = selectedPlotIndex === index;
      const sideMaterial = new THREE.MeshStandardMaterial({
        color: isDiseasePlot ? DISEASE_SIDE_COLOR : zone.theme.color,
        roughness: isReserve ? 0.9 : 0.82,
        metalness: isReserve ? 0.01 : 0.03,
        transparent: true,
        opacity: isReserve ? 0.45 : 0.84,
      });
      const topMaterial = new THREE.MeshStandardMaterial({
        color: isDiseasePlot ? DISEASE_TOP_COLOR : zone.theme.light,
        roughness: 0.72,
        metalness: 0.05,
      });
      if (isDiseasePlot) {
        sideMaterial.emissive = new THREE.Color("#7f1d1d");
        sideMaterial.emissiveIntensity = isSelected ? 0.45 : 0.3;
        topMaterial.emissive = new THREE.Color("#f43f5e");
        topMaterial.emissiveIntensity = isSelected ? 0.16 : 0.1;
      }
      const materials: THREE.Material[] = [sideMaterial, topMaterial, topMaterial.clone()];
      const mesh = new THREE.Mesh(geometry, materials);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.position.set(slotPosition.x, height / 2 + (isSelected ? SELECTED_PLOT_LIFT : 0), slotPosition.z);
      mesh.userData.plotIndex = index;
      if (isSelected) {
        const selectedSide = materials[0] as THREE.MeshStandardMaterial;
        selectedSide.opacity = 1;
        selectedSide.emissive = new THREE.Color(zone.theme.dark);
        selectedSide.emissiveIntensity = 0.2;
      }

      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(geometry, 28),
        new THREE.LineBasicMaterial({
          color: isDiseasePlot ? DISEASE_EDGE_COLOR : zone.theme.dark,
          transparent: true,
          opacity: isSelected ? 1 : 0.8,
        }),
      );
      edges.position.copy(mesh.position);

      state.group.add(mesh);
      state.group.add(edges);
      state.plotMeshes.push(mesh);
      state.interactiveObjects.push(mesh);

      {
        const markerCanvas = document.createElement("canvas");
        markerCanvas.width = 128;
        markerCanvas.height = 128;
        const markerCtx = markerCanvas.getContext("2d");
        if (!markerCtx) return;
        markerCtx.clearRect(0, 0, 128, 128);
        // Small icon marker: outer ring + inner dot.
        markerCtx.fillStyle = isDiseasePlot
          ? isSelected
            ? "rgba(159, 18, 57, 0.95)"
            : "rgba(190, 24, 93, 0.88)"
          : isSelected
            ? "rgba(19, 112, 57, 0.95)"
            : "rgba(35, 132, 79, 0.82)";
        markerCtx.beginPath();
        markerCtx.arc(64, 64, 20, 0, Math.PI * 2);
        markerCtx.fill();
        markerCtx.fillStyle = isDiseasePlot ? "rgba(255, 239, 242, 0.96)" : "rgba(236, 250, 241, 0.95)";
        markerCtx.beginPath();
        markerCtx.arc(64, 64, 13, 0, Math.PI * 2);
        markerCtx.fill();
        markerCtx.fillStyle = isDiseasePlot
          ? "rgba(225, 29, 72, 0.96)"
          : isSelected
            ? "rgba(20, 118, 56, 0.95)"
            : "rgba(49, 156, 100, 0.9)";
        markerCtx.beginPath();
        markerCtx.arc(64, 64, 5, 0, Math.PI * 2);
        markerCtx.fill();

        const markerLabel = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: new THREE.CanvasTexture(markerCanvas),
            transparent: true,
            depthTest: true,
            depthWrite: false,
          }),
        );
        markerLabel.scale.set(isSelected ? 8.8 : 8.1, isSelected ? 8.8 : 8.1, 1);
        markerLabel.position.set(slotPosition.x, height + 9 + (isSelected ? SELECTED_PLOT_LIFT : 0), slotPosition.z);
        state.group.add(markerLabel);
      }

      const cropCanvas = document.createElement("canvas");
      cropCanvas.width = 256;
      cropCanvas.height = 256;
      const cropCtx = cropCanvas.getContext("2d");
      if (!cropCtx) return;

      cropCtx.clearRect(0, 0, 256, 256);
      cropCtx.fillStyle = slot.crop ? "rgba(255,255,255,0.95)" : "rgba(235, 245, 238, 0.86)";
      cropCtx.beginPath();
      cropCtx.arc(128, 128, slot.crop ? 66 : 52, 0, Math.PI * 2);
      cropCtx.fill();

      cropCtx.font = slot.crop
        ? "700 104px 'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif"
        : "700 88px system-ui";
      cropCtx.textAlign = "center";
      cropCtx.textBaseline = "middle";
      cropCtx.fillStyle = slot.crop ? "#1d5f39" : "rgba(76, 126, 95, 0.8)";
      cropCtx.fillText(slot.crop ? slot.crop.emoji : "•", 128, 132);

      const cropSprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: new THREE.CanvasTexture(cropCanvas),
          transparent: true,
          opacity: slot.crop ? 1 : 0.8,
          depthTest: true,
          depthWrite: false,
        }),
      );
      const baseScale = slot.crop ? 19 : 13;
      cropSprite.scale.set(isSelected ? baseScale + 2 : baseScale, isSelected ? baseScale + 2 : baseScale, 1);
      cropSprite.position.set(slotPosition.x, height + 20 + (isSelected ? SELECTED_PLOT_LIFT : 0), slotPosition.z);
      state.group.add(cropSprite);

      if (isDiseasePlot) {
        const ringMaterial = new THREE.MeshBasicMaterial({
          color: "#fb7185",
          transparent: true,
          opacity: 0.52,
          depthWrite: false,
        });
        const ringInner = new THREE.Mesh(new THREE.TorusGeometry(HEX_RADIUS * 0.58, 1.35, 12, 48), ringMaterial);
        ringInner.rotation.x = Math.PI / 2;
        ringInner.position.set(slotPosition.x, height + 5 + (isSelected ? SELECTED_PLOT_LIFT : 0), slotPosition.z);
        ringInner.userData.effectType = "infectionRing";
        ringInner.userData.baseScale = 1;
        ringInner.userData.phase = index * 0.4;
        state.group.add(ringInner);

        const ringOuter = new THREE.Mesh(
          new THREE.TorusGeometry(HEX_RADIUS * 0.8, 1, 10, 42),
          new THREE.MeshBasicMaterial({
            color: "#f43f5e",
            transparent: true,
            opacity: 0.36,
            depthWrite: false,
          }),
        );
        ringOuter.rotation.x = Math.PI / 2;
        ringOuter.position.set(slotPosition.x, height + 7.2 + (isSelected ? SELECTED_PLOT_LIFT : 0), slotPosition.z);
        ringOuter.userData.effectType = "infectionRing";
        ringOuter.userData.baseScale = 1;
        ringOuter.userData.phase = index * 0.4 + 1.2;
        state.group.add(ringOuter);

        const warningLight = new THREE.PointLight("#f43f5e", isSelected ? 1.3 : 1.0, 74, 2.1);
        warningLight.position.set(slotPosition.x, height + 13 + (isSelected ? SELECTED_PLOT_LIFT : 0), slotPosition.z);
        warningLight.userData.effectType = "infectionLight";
        warningLight.userData.baseIntensity = isSelected ? 1.3 : 1.0;
        warningLight.userData.phase = index * 0.4 + 0.6;
        state.group.add(warningLight);

        const hazardCanvas = document.createElement("canvas");
        hazardCanvas.width = 256;
        hazardCanvas.height = 256;
        const hazardCtx = hazardCanvas.getContext("2d");
        if (!hazardCtx) return;
        const grad = hazardCtx.createRadialGradient(128, 124, 12, 128, 128, 92);
        grad.addColorStop(0, "rgba(255, 241, 244, 0.96)");
        grad.addColorStop(1, "rgba(244, 63, 94, 0.08)");
        hazardCtx.fillStyle = grad;
        hazardCtx.beginPath();
        hazardCtx.arc(128, 128, 92, 0, Math.PI * 2);
        hazardCtx.fill();
        hazardCtx.fillStyle = "#9f1239";
        hazardCtx.font = "700 126px system-ui";
        hazardCtx.textAlign = "center";
        hazardCtx.textBaseline = "middle";
        hazardCtx.fillText("☣", 128, 134);

        const hazardSprite = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: new THREE.CanvasTexture(hazardCanvas),
            transparent: true,
            depthTest: true,
            depthWrite: false,
            opacity: 0.95,
          }),
        );
        hazardSprite.scale.set(isSelected ? 12 : 10.8, isSelected ? 12 : 10.8, 1);
        const baseY = height + 34 + (isSelected ? SELECTED_PLOT_LIFT : 0);
        hazardSprite.position.set(slotPosition.x, baseY, slotPosition.z);
        hazardSprite.userData.effectType = "infectionBadge";
        hazardSprite.userData.baseY = baseY;
        hazardSprite.userData.phase = index * 0.4;
        state.group.add(hazardSprite);
      }

    });
  }, [zone, plotSlots, selectedPlotIndex]);

  return <div ref={mountRef} className="h-full min-h-0 w-full overflow-hidden rounded-xl" aria-label={`${zone.name} 3D view`} />;
}
