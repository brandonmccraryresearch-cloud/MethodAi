'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  type ClaimExperimentRecord,
  computeUM1Grade,
  VERIFICATION_LADDER_SPECS,
} from '@/lib/um1-engine';
import {
  Compass,
  Eye,
  Layers,
  Maximize2,
  Minimize2,
  RotateCcw,
  Sliders,
} from 'lucide-react';

interface CoScientist3DSceneProps {
  claims: ClaimExperimentRecord[];
  selectedClaimId: string;
  onSelectClaim: (claimId: string) => void;
  onAdvanceRung?: (claimId: string) => void;
}

type CameraPreset = 'overview' | 'focus-claim' | 'rung-elevation' | 'dependency-top';

export default function CoScientist3DScene({
  claims,
  selectedClaimId,
  onSelectClaim,
  onAdvanceRung,
}: CoScientist3DSceneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('overview');
  const [showPremiseOrbits, setShowPremiseOrbits] = useState<boolean>(true);
  const [showRungPlanes, setShowRungPlanes] = useState<boolean>(true);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [dockCollapsed, setDockCollapsed] = useState<boolean>(false);
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);

  const requestRenderRef = useRef<(() => void) | null>(null);
  const targetCamPosRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 6.2, 13.5));
  const targetLookAtRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 1.8, 0));
  const usePresetTransitionRef = useRef<boolean>(false);
  const claimAnchorsRef = useRef<Map<string, THREE.Vector3>>(new Map());
  const selectedClaimIdRef = useRef<string>(selectedClaimId);
  const autoRotateRef = useRef<boolean>(autoRotate);
  const showPremiseOrbitsRef = useRef<boolean>(showPremiseOrbits);
  const showRungPlanesRef = useRef<boolean>(showRungPlanes);

  useEffect(() => {
    selectedClaimIdRef.current = selectedClaimId;
    if (cameraPreset === 'focus-claim') {
      const anchor = claimAnchorsRef.current.get(selectedClaimId);
      if (anchor) {
        targetLookAtRef.current.copy(anchor);
        targetCamPosRef.current.set(anchor.x * 1.45, anchor.y + 2.2, anchor.z + 5.8);
        usePresetTransitionRef.current = true;
      }
    }
    requestRenderRef.current?.();
  }, [selectedClaimId, cameraPreset]);

  useEffect(() => {
    autoRotateRef.current = autoRotate;
    requestRenderRef.current?.();
  }, [autoRotate]);

  useEffect(() => {
    showPremiseOrbitsRef.current = showPremiseOrbits;
    requestRenderRef.current?.();
  }, [showPremiseOrbits]);

  useEffect(() => {
    showRungPlanesRef.current = showRungPlanes;
    requestRenderRef.current?.();
  }, [showRungPlanes]);

  const applyCameraPreset = (preset: CameraPreset) => {
    setCameraPreset(preset);
    if (preset === 'overview') {
      targetLookAtRef.current.set(0, 1.8, 0);
      targetCamPosRef.current.set(0, 6.2, 13.5);
    } else if (preset === 'rung-elevation') {
      targetLookAtRef.current.set(0, 2.5, 0);
      targetCamPosRef.current.set(11.5, 2.6, 0.5);
    } else if (preset === 'dependency-top') {
      targetLookAtRef.current.set(0, 1.0, 0);
      targetCamPosRef.current.set(0, 15.2, 2.2);
    } else if (preset === 'focus-claim') {
      const anchor = claimAnchorsRef.current.get(selectedClaimIdRef.current);
      if (anchor) {
        targetLookAtRef.current.copy(anchor);
        targetCamPosRef.current.set(anchor.x * 1.45, anchor.y + 2.2, anchor.z + 5.8);
      }
    }
    usePresetTransitionRef.current = true;
    requestRenderRef.current?.();
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 900;
    const height = container.clientHeight || 520;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });

    const gl = renderer.getContext();
    const debugBasic = gl.getExtension('WEBGL_debug_renderer_info');
    const rendererInfo = debugBasic
      ? String(gl.getParameter(debugBasic.UNMASKED_RENDERER_WEBGL))
      : '';
    const isSoftwareGl = /SwiftShader|llvmpipe|Software|Google Inc\. \(Google\)/i.test(
      rendererInfo
    );

    const dpr = isSoftwareGl ? 1.0 : Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const bgHex = 0x0b1120;
    scene.background = new THREE.Color(bgHex);
    scene.fog = new THREE.FogExp2(bgHex, 0.026);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTarget = pmremGenerator.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 6.2, 13.5);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI * 0.48;
    controls.minDistance = 4.5;
    controls.maxDistance = 24;
    controls.target.set(0, 1.8, 0);

    const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x1e293b, 0.65);
    hemiLight.position.set(0, 18, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff5e6, 2.2);
    keyLight.position.set(8, 14, 9);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.bias = -0.0005;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x60a5fa, 0.95);
    rimLight.position.set(-9, 8, -10);
    scene.add(rimLight);

    const disposableGeometries: THREE.BufferGeometry[] = [];
    const disposableMaterials: THREE.Material[] = [];

    const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
      disposableGeometries.push(g);
      return g;
    };
    const trackMat = <T extends THREE.Material>(m: T): T => {
      disposableMaterials.push(m);
      return m;
    };

    const segs = isSoftwareGl ? 16 : 32;

    // 1. Central UM-1 Rung 0–5 Calibration Spire (Composite Group)
    const spireGroup = new THREE.Group();
    scene.add(spireGroup);

    const basePoints = [
      new THREE.Vector2(0, -0.4),
      new THREE.Vector2(6.4, -0.4),
      new THREE.Vector2(6.2, -0.15),
      new THREE.Vector2(5.6, -0.08),
      new THREE.Vector2(5.4, 0.0),
      new THREE.Vector2(0, 0.0),
    ];
    const baseLatheGeo = trackGeo(new THREE.LatheGeometry(basePoints, segs));
    const basePlatformMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        metalness: 0.65,
        roughness: 0.35,
      })
    );
    const baseMesh = new THREE.Mesh(baseLatheGeo, basePlatformMat);
    baseMesh.receiveShadow = !isSoftwareGl;
    spireGroup.add(baseMesh);

    const coreAxisGeo = trackGeo(new THREE.CylinderGeometry(0.14, 0.22, 5.4, segs));
    const coreAxisMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x334155,
        metalness: 0.85,
        roughness: 0.2,
      })
    );
    const coreAxisMesh = new THREE.Mesh(coreAxisGeo, coreAxisMat);
    coreAxisMesh.position.y = 2.6;
    spireGroup.add(coreAxisMesh);

    // Rung 0 to Rung 5 Horizontal Elevation Rings
    const rungPlanesGroup = new THREE.Group();
    scene.add(rungPlanesGroup);

    for (let r = 0; r <= 5; r++) {
      const yPos = 0.45 + r * 0.88;
      const ringRadius = 4.6 - r * 0.22;
      const ringGeo = trackGeo(new THREE.TorusGeometry(ringRadius, 0.025, 12, segs * 2));
      const ringMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: r === 5 ? 0x38bdf8 : r >= 3 ? 0x6366f1 : 0x475569,
          metalness: 0.7,
          roughness: 0.25,
          transparent: true,
          opacity: 0.55,
        })
      );
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = Math.PI / 2;
      ringMesh.position.y = yPos;
      rungPlanesGroup.add(ringMesh);
    }

    // 2. InstancedMesh for 36 perimeter calibration ticks across Rungs 0–5
    const tickCount = 36;
    const tickGeo = trackGeo(new THREE.BoxGeometry(0.08, 0.16, 0.24));
    const tickMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x64748b,
        metalness: 0.8,
        roughness: 0.25,
      })
    );
    const instancedTicks = new THREE.InstancedMesh(tickGeo, tickMat, tickCount);
    const dummyObj = new THREE.Object3D();
    for (let i = 0; i < tickCount; i++) {
      const rungIdx = Math.floor(i / 6);
      const angle = ((i % 6) / 6) * Math.PI * 2;
      const radius = 4.6 - rungIdx * 0.22;
      const yPos = 0.45 + rungIdx * 0.88;
      dummyObj.position.set(Math.cos(angle) * radius, yPos, Math.sin(angle) * radius);
      dummyObj.lookAt(0, yPos, 0);
      dummyObj.updateMatrix();
      instancedTicks.setMatrixAt(i, dummyObj.matrix);
    }
    instancedTicks.instanceMatrix.needsUpdate = true;
    rungPlanesGroup.add(instancedTicks);

    // 3. Build Composite Scientific Verification Apparatus (7-part THREE.Group) per Claim
    const interactiveMeshes: THREE.Object3D[] = [];
    const claimGroups: Array<{
      claimId: string;
      group: THREE.Group;
      outerGimbal: THREE.Mesh;
      innerGimbal: THREE.Mesh;
      coreMesh: THREE.Mesh;
      selectionHalo: THREE.Mesh;
      premiseGroup: THREE.Group;
    }> = [];

    const anchorsMap = new Map<string, THREE.Vector3>();

    const plinthPoints = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.72, 0),
      new THREE.Vector2(0.66, 0.14),
      new THREE.Vector2(0.46, 0.22),
      new THREE.Vector2(0.42, 0.36),
      new THREE.Vector2(0, 0.36),
    ];
    const plinthGeo = trackGeo(new THREE.LatheGeometry(plinthPoints, segs));
    const collarGeo = trackGeo(new THREE.TorusGeometry(0.58, 0.055, 14, segs));
    const outerGimbalGeo = trackGeo(new THREE.TorusGeometry(0.76, 0.035, 14, segs));
    const innerGimbalGeo = trackGeo(new THREE.TorusGeometry(0.56, 0.028, 12, segs));
    const deductiveCoreGeo = trackGeo(new THREE.OctahedronGeometry(0.36, 0));
    const empiricalCoreGeo = trackGeo(new THREE.IcosahedronGeometry(0.36, 1));
    const beaconCapGeo = trackGeo(new THREE.ConeGeometry(0.16, 0.28, segs));
    const selectionHaloGeo = trackGeo(new THREE.TorusGeometry(0.98, 0.04, 14, segs));
    const premiseOrbGeo = trackGeo(new THREE.SphereGeometry(0.12, 14, 14));

    claims.forEach((claim, idx) => {
      const gradeResult = computeUM1Grade(claim.gradingInput);
      const currentRung = claim.gradingInput.verificationRung;
      const track = claim.gradingInput.track;
      const angle = (idx / Math.max(claims.length, 1)) * Math.PI * 2 + Math.PI / 6;
      const orbitRadius = 3.35;
      const rungY = 0.45 + currentRung * 0.88;
      const posX = Math.cos(angle) * orbitRadius;
      const posZ = Math.sin(angle) * orbitRadius;

      const anchorVec = new THREE.Vector3(posX, rungY, posZ);
      anchorsMap.set(claim.id, anchorVec);

      let coreHex = 0x3b82f6;
      let emissiveHex = 0x1d4ed8;
      if (
        gradeResult.finalGrade === 'INCOMPLETE-EVIDENCE' ||
        gradeResult.finalGrade === 'ABSTAIN'
      ) {
        coreHex = 0xf59e0b;
        emissiveHex = 0xb45309;
      } else if (gradeResult.finalGrade === 'F1' || gradeResult.finalGrade === 'A') {
        coreHex = 0x10b981;
        emissiveHex = 0x047857;
      } else if (gradeResult.finalGrade === 'CONTRADICTED') {
        coreHex = 0xef4444;
        emissiveHex = 0x991b1b;
      }

      const apparatusGroup = new THREE.Group();
      apparatusGroup.position.copy(anchorVec);
      apparatusGroup.userData = {
        claimId: claim.id,
        label: `${claim.id} (${claim.expId || `Track ${track}`}) · Grade ${gradeResult.finalGrade} · Rung ${currentRung}`,
      };
      scene.add(apparatusGroup);

      // Part 1: Lathe Pedestal Base
      const plinthMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: 0x1e293b,
          metalness: 0.75,
          roughness: 0.28,
        })
      );
      const plinthMesh = new THREE.Mesh(plinthGeo, plinthMat);
      plinthMesh.position.y = -0.58;
      plinthMesh.userData = apparatusGroup.userData;
      apparatusGroup.add(plinthMesh);
      interactiveMeshes.push(plinthMesh);

      // Part 2: Vertical Support Strut from Base Platform (y=0) to Apparatus
      const strutHeight = Math.max(0.2, rungY - 0.55);
      const strutGeo = trackGeo(new THREE.CylinderGeometry(0.06, 0.09, strutHeight, 12));
      const strutMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: 0x475569,
          metalness: 0.8,
          roughness: 0.3,
        })
      );
      const strutMesh = new THREE.Mesh(strutGeo, strutMat);
      strutMesh.position.y = -0.58 - strutHeight / 2;
      apparatusGroup.add(strutMesh);

      // Part 3: Calibrated Rung Collar
      const collarMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: 0x94a3b8,
          metalness: 0.85,
          roughness: 0.2,
        })
      );
      const collarMesh = new THREE.Mesh(collarGeo, collarMat);
      collarMesh.rotation.x = Math.PI / 2;
      collarMesh.position.y = -0.22;
      collarMesh.userData = apparatusGroup.userData;
      apparatusGroup.add(collarMesh);
      interactiveMeshes.push(collarMesh);

      // Part 4: Outer Gimbal Stabilization Ring
      const outerGimbalMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: 0xe2e8f0,
          metalness: 0.9,
          roughness: 0.15,
        })
      );
      const outerGimbal = new THREE.Mesh(outerGimbalGeo, outerGimbalMat);
      outerGimbal.rotation.x = 0.45;
      outerGimbal.userData = apparatusGroup.userData;
      apparatusGroup.add(outerGimbal);
      interactiveMeshes.push(outerGimbal);

      // Part 5: Inner Precision Containment Ring
      const innerGimbalMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: coreHex,
          metalness: 0.7,
          roughness: 0.22,
        })
      );
      const innerGimbal = new THREE.Mesh(innerGimbalGeo, innerGimbalMat);
      innerGimbal.rotation.y = 0.8;
      innerGimbal.userData = apparatusGroup.userData;
      apparatusGroup.add(innerGimbal);
      interactiveMeshes.push(innerGimbal);

      // Part 6: Central Analytical Core (Octahedron for Track F, Icosahedron for Track E)
      const coreMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: coreHex,
          emissive: emissiveHex,
          emissiveIntensity: 0.45,
          metalness: 0.35,
          roughness: 0.18,
        })
      );
      const coreMesh = new THREE.Mesh(
        track === 'F' ? deductiveCoreGeo : empiricalCoreGeo,
        coreMat
      );
      coreMesh.userData = apparatusGroup.userData;
      apparatusGroup.add(coreMesh);
      interactiveMeshes.push(coreMesh);

      // Part 7: Top Telemetry Beacon Cap
      const beaconMesh = new THREE.Mesh(beaconCapGeo, innerGimbalMat);
      beaconMesh.position.y = 0.82;
      beaconMesh.userData = apparatusGroup.userData;
      apparatusGroup.add(beaconMesh);
      interactiveMeshes.push(beaconMesh);

      // Selection Halo Ring
      const haloMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: 0x38bdf8,
          emissive: 0x0284c7,
          emissiveIntensity: 0.75,
          metalness: 0.5,
          roughness: 0.2,
        })
      );
      const selectionHalo = new THREE.Mesh(selectionHaloGeo, haloMat);
      selectionHalo.rotation.x = Math.PI / 2;
      selectionHalo.position.y = -0.22;
      selectionHalo.visible = claim.id === selectedClaimIdRef.current;
      apparatusGroup.add(selectionHalo);

      // Premise Dependency Satellites & TubeGeometry Conduits
      const premiseGroup = new THREE.Group();
      apparatusGroup.add(premiseGroup);

      claim.dependencyLedgerItems.forEach((perm, pIdx) => {
        const pAngle =
          (pIdx / Math.max(claim.dependencyLedgerItems.length, 1)) * Math.PI * 2;
        const pRadius = 1.28;
        const pY = (pIdx % 2 === 0 ? 1 : -1) * 0.28;
        const satPos = new THREE.Vector3(
          Math.cos(pAngle) * pRadius,
          pY,
          Math.sin(pAngle) * pRadius
        );

        const isUnrederived = perm.isLeafTranscription && !perm.independentlyRederived;
        const satMat = trackMat(
          new THREE.MeshStandardMaterial({
            color: isUnrederived ? 0xf59e0b : 0x34d399,
            emissive: isUnrederived ? 0xd97706 : 0x059669,
            emissiveIntensity: 0.4,
            metalness: 0.4,
            roughness: 0.25,
          })
        );
        const satMesh = new THREE.Mesh(premiseOrbGeo, satMat);
        satMesh.position.copy(satPos);
        premiseGroup.add(satMesh);

        const curve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(satPos.x * 0.5, satPos.y * 1.4, satPos.z * 0.5),
          satPos,
        ]);
        const tubeGeo = trackGeo(new THREE.TubeGeometry(curve, 12, 0.016, 6, false));
        const tubeMesh = new THREE.Mesh(tubeGeo, satMat);
        premiseGroup.add(tubeMesh);
      });

      const spireBridgeCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(-posX * 0.5, 0.18, -posZ * 0.5),
        new THREE.Vector3(-posX, 0, -posZ),
      ]);
      const bridgeGeo = trackGeo(new THREE.TubeGeometry(spireBridgeCurve, 16, 0.024, 8, false));
      const bridgeMesh = new THREE.Mesh(bridgeGeo, innerGimbalMat);
      apparatusGroup.add(bridgeMesh);

      claimGroups.push({
        claimId: claim.id,
        group: apparatusGroup,
        outerGimbal,
        innerGimbal,
        coreMesh,
        selectionHalo,
        premiseGroup,
      });
    });

    claimAnchorsRef.current = anchorsMap;

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const flushPixel = new Uint8Array(4);

    const handlePointerMove = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(interactiveMeshes, false);
      if (hits.length > 0 && hits[0].object.userData?.label) {
        renderer.domElement.style.cursor = 'pointer';
        setHoveredLabel(String(hits[0].object.userData.label));
      } else {
        renderer.domElement.style.cursor = 'grab';
        setHoveredLabel(null);
      }
    };

    const handlePointerDown = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(interactiveMeshes, false);
      if (hits.length > 0 && hits[0].object.userData?.claimId) {
        const clickedId = String(hits[0].object.userData.claimId);
        onSelectClaim(clickedId);
      }
    };

    const handleControlStart = () => {
      usePresetTransitionRef.current = false;
    };

    renderer.domElement.addEventListener('mousemove', handlePointerMove);
    renderer.domElement.addEventListener('mousedown', handlePointerDown);
    controls.addEventListener('start', handleControlStart);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.max(300, entry.contentRect.width);
        const h = Math.max(320, entry.contentRect.height);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    });
    resizeObserver.observe(container);

    const afterDraw = () => {
      if (!isSoftwareGl) return;
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, flushPixel);
    };

    let disposed = false;
    let rafId = 0;
    let lastTime = performance.now();

    const animate = (now: number) => {
      if (disposed) return;
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      rungPlanesGroup.visible = showRungPlanesRef.current;

      if (usePresetTransitionRef.current) {
        const alpha = 1 - Math.exp(-5.5 * dt);
        camera.position.lerp(targetCamPosRef.current, alpha);
        controls.target.lerp(targetLookAtRef.current, alpha);
        if (
          camera.position.distanceToSquared(targetCamPosRef.current) < 0.01 &&
          controls.target.distanceToSquared(targetLookAtRef.current) < 0.01
        ) {
          usePresetTransitionRef.current = false;
        }
      }

      controls.autoRotate = autoRotateRef.current && !usePresetTransitionRef.current;
      controls.autoRotateSpeed = 0.65;
      controls.update();

      for (let i = 0; i < claimGroups.length; i++) {
        const item = claimGroups[i];
        const isSelected = item.claimId === selectedClaimIdRef.current;
        item.selectionHalo.visible = isSelected;
        item.premiseGroup.visible = showPremiseOrbitsRef.current;

        const speedBoost = isSelected ? 1.65 : 0.75;
        item.outerGimbal.rotation.z += dt * 0.45 * speedBoost;
        item.innerGimbal.rotation.x += dt * 0.65 * speedBoost;
        item.coreMesh.rotation.y += dt * 0.8 * speedBoost;
        item.premiseGroup.rotation.y -= dt * 0.35;
      }

      renderer.render(scene, camera);
      afterDraw();

      rafId = requestAnimationFrame(animate);
    };

    requestRenderRef.current = () => {
      // Handled by damped loop
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('mousemove', handlePointerMove);
      renderer.domElement.removeEventListener('mousedown', handlePointerDown);
      controls.removeEventListener('start', handleControlStart);
      controls.dispose();
      envTarget.dispose();
      disposableGeometries.forEach((g) => g.dispose());
      disposableMaterials.forEach((m) => m.dispose());
      renderer.dispose();
    };
  }, [claims, onSelectClaim]);

  const activeClaim = claims.find((c) => c.id === selectedClaimId) || claims[0];
  const activeGrade = activeClaim ? computeUM1Grade(activeClaim.gradingInput) : null;
  const activeRung = activeClaim ? activeClaim.gradingInput.verificationRung : 0;
  const activeRungSpec = activeClaim ? VERIFICATION_LADDER_SPECS[activeRung] : null;

  return (
    <div className="relative w-full h-[540px] rounded-lg overflow-hidden border border-slate-800 bg-[#0b1120] select-none">
      {/* Three.js Canvas Mount */}
      <div
        ref={containerRef}
        className="w-full h-full"
        data-testid="coscientist-3d-canvas"
      />

      {/* Top-Left Minimal Telemetry Header (Solid dark slate, zero backdrop-filter) */}
      <div className="absolute top-3 left-3 max-w-md bg-[#0f172a] border border-slate-800 rounded-md px-3.5 py-2.5 shadow-lg pointer-events-auto">
        <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-sky-400">
          <Compass className="w-3.5 h-3.5" />
          <span>Co-Scientist 3D Hypothesis &amp; Rung Lattice</span>
        </div>
        {activeClaim && activeGrade ? (
          <div className="mt-1">
            <div className="text-xs font-semibold text-slate-100 truncate">
              {activeClaim.id} · {activeClaim.expId || `Track ${activeClaim.gradingInput.track}`} ·{' '}
              {activeRungSpec?.name}
            </div>
            <div className="text-[11px] font-mono text-slate-400 mt-0.5">
              Computable Grade:{' '}
              <span className="text-emerald-400 font-semibold">{activeGrade.finalGrade}</span> ·{' '}
              Independence:{' '}
              <span className="text-sky-300">{activeClaim.gradingInput.independence}</span> ·{' '}
              Premises:{' '}
              <span className="text-slate-200">{activeClaim.dependencyLedgerItems.length}</span>
            </div>
          </div>
        ) : (
          <div className="mt-1 text-xs text-slate-300">
            Rung 0–5 Calibration Spire active. Register a claim to populate orbital nodes.
          </div>
        )}
        {hoveredLabel && (
          <div className="mt-1.5 pt-1.5 border-t border-slate-800 text-[11px] font-mono text-amber-300">
            Inspecting: {hoveredLabel}
          </div>
        )}
      </div>

      {/* Top-Right Claim Node Quick Switcher */}
      {claims.length > 0 && (
        <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-[#0f172a] border border-slate-800 rounded-md p-1.5 shadow-lg pointer-events-auto">
          {claims.map((c) => {
            const g = computeUM1Grade(c.gradingInput);
            const isSel = c.id === selectedClaimId;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  onSelectClaim(c.id);
                  applyCameraPreset('focus-claim');
                }}
                className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                  isSel
                    ? 'bg-sky-600 text-white font-semibold'
                    : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                }`}
              >
                {c.id} [{g.finalGrade === 'INCOMPLETE-EVIDENCE' ? 'INC-EV' : g.finalGrade}]
              </button>
            );
          })}
        </div>
      )}

      {/* Collapsible Bottom Control Dock (<= 15% viewport height, no backdrop-filter) */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 bg-[#0f172a] border border-slate-800 rounded-md px-3 py-2 shadow-lg pointer-events-auto">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setDockCollapsed(!dockCollapsed)}
            className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-mono text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-700"
            title={dockCollapsed ? 'Expand scene controls' : 'Collapse scene controls'}
          >
            {dockCollapsed ? (
              <Maximize2 className="w-3.5 h-3.5" />
            ) : (
              <Minimize2 className="w-3.5 h-3.5" />
            )}
            <span>{dockCollapsed ? 'Controls' : 'Hide'}</span>
          </button>

          {!dockCollapsed && (
            <>
              <div className="h-4 w-px bg-slate-800" />
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-mono text-slate-400 mr-1 flex items-center gap-1">
                  <Eye className="w-3 h-3" /> Camera:
                </span>
                {(
                  [
                    { id: 'overview', label: 'Overview' },
                    { id: 'focus-claim', label: 'Focus Claim' },
                    { id: 'rung-elevation', label: 'Rung Side' },
                    { id: 'dependency-top', label: 'DAG Top' },
                  ] as const
                ).map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyCameraPreset(preset.id)}
                    className={`px-2 py-1 rounded text-xs font-mono transition-colors ${
                      cameraPreset === preset.id
                        ? 'bg-sky-600 text-white'
                        : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <div className="h-4 w-px bg-slate-800" />
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowRungPlanes(!showRungPlanes)}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-mono border ${
                    showRungPlanes
                      ? 'bg-slate-800 text-sky-300 border-sky-700'
                      : 'bg-slate-900 text-slate-400 border-slate-800'
                  }`}
                >
                  <Layers className="w-3 h-3" /> Rung Rings
                </button>
                <button
                  type="button"
                  onClick={() => setShowPremiseOrbits(!showPremiseOrbits)}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-mono border ${
                    showPremiseOrbits
                      ? 'bg-slate-800 text-emerald-300 border-emerald-700'
                      : 'bg-slate-900 text-slate-400 border-slate-800'
                  }`}
                >
                  <Sliders className="w-3 h-3" /> Premise Conduits
                </button>
                <button
                  type="button"
                  onClick={() => setAutoRotate(!autoRotate)}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-mono border ${
                    autoRotate
                      ? 'bg-slate-800 text-amber-300 border-amber-700'
                      : 'bg-slate-900 text-slate-400 border-slate-800'
                  }`}
                >
                  <RotateCcw className="w-3 h-3" /> Orbit
                </button>
              </div>
            </>
          )}
        </div>

        {activeClaim && onAdvanceRung && activeClaim.gradingInput.verificationRung < 5 && (
          <button
            type="button"
            onClick={() => onAdvanceRung(activeClaim.id)}
            className="px-2.5 py-1 rounded text-xs font-mono font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shrink-0"
          >
            Elevate {activeClaim.id} to Rung {activeClaim.gradingInput.verificationRung + 1}
          </button>
        )}
      </div>
    </div>
  );
}
