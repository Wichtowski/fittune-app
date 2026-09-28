import { useEffect, useRef, useState } from "react";
import { AmbientLight, Box3, Color, DirectionalLight, Mesh, MeshLambertMaterial, PerspectiveCamera, Scene, SRGBColorSpace, Vector3, WebGLRenderer, type Group } from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { DRACOLoader, DRACO_GLTF_CONFIG } from "three/addons/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

import { engagement } from "../anatomy";
import { MuscleIllustration } from "./muscle-illustration";
import { t } from "@/lib/i18n";
import { muscleLabels } from "@/lib/labels";
import type { Muscle } from "@/schemas/common";

function themeColor(name: string): Color {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) return new Color("#888888");
  context.fillStyle = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  context.fillRect(0, 0, 1, 1);
  const [red, green, blue] = context.getImageData(0, 0, 1, 1).data;
  return new Color().setRGB((red ?? 0) / 255, (green ?? 0) / 255, (blue ?? 0) / 255, SRGBColorSpace);
}

export default function AnatomyViewer({ muscle, secondaryMuscles }: { muscle: Muscle; secondaryMuscles: readonly Muscle[] }) {
  const container = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    const host = container.current;
    if (!host) return;

    let disposed = false;
    let frame = 0;
    let model: Group | null = null;
    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch {
      const failureFrame = requestAnimationFrame(() => setState("error"));
      return () => cancelAnimationFrame(failureFrame);
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    host.append(renderer.domElement);
    renderer.domElement.className = "size-full touch-none";

    const scene = new Scene();
    scene.add(new AmbientLight(0xffffff, 0.8));
    const light = new DirectionalLight(0xffffff, 1.2);
    light.position.set(-1, 2, 3);
    scene.add(light);
    const camera = new PerspectiveCamera(35, 1, 0.1, 10000);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableDamping = false;
    controls.autoRotate = false;

    const materials = {
      primary: new MeshLambertMaterial({ color: themeColor("--muscle-load-high") }),
      secondary: new MeshLambertMaterial({ color: themeColor("--muscle-load-low") }),
      inactive: new MeshLambertMaterial({ color: themeColor("--anatomy-muscle") }),
    };
    const themeObserver = new MutationObserver(() => {
      materials.primary.color.copy(themeColor("--muscle-load-high"));
      materials.secondary.color.copy(themeColor("--muscle-load-low"));
      materials.inactive.color.copy(themeColor("--anatomy-muscle"));
      requestRender();
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    const render = () => {
      frame = 0;
      renderer.render(scene, camera);
    };
    const requestRender = () => {
      if (!frame) frame = requestAnimationFrame(render);
    };
    const resize = () => {
      const { width, height } = host.getBoundingClientRect();
      if (!width || !height) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      requestRender();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    controls.addEventListener("change", requestRender);

    const draco = new DRACOLoader();
    draco.setDecoderPath(DRACO_GLTF_CONFIG);
    draco.setWorkerLimit(2);
    const loader = new GLTFLoader();
    loader.setDRACOLoader(draco);
    void loader.loadAsync(`${import.meta.env.BASE_URL}anatomy/bodyparts3d-3.glb`).then((gltf) => {
      if (disposed) {
        gltf.scene.traverse((object) => {
          if (!(object instanceof Mesh)) return;
          object.geometry.dispose();
          for (const material of Array.isArray(object.material) ? object.material : [object.material]) material.dispose();
        });
        return;
      }
      const loadedModel = gltf.scene;
      model = loadedModel;
      loadedModel.traverse((object) => {
        if (!(object instanceof Mesh)) return;
        const original = object.material;
        const group = object.userData.muscle as Muscle | undefined;
        object.material = object.userData.kind === "bone" ? materials.inactive : materials[engagement(group ?? null, muscle, secondaryMuscles)];
        for (const material of Array.isArray(original) ? original : [original]) material.dispose();
      });
      scene.add(loadedModel);
      const bounds = new Box3().setFromObject(loadedModel);
      const center = bounds.getCenter(new Vector3());
      const height = bounds.max.y - bounds.min.y;
      const distance = height / (2 * Math.tan((camera.fov * Math.PI) / 360)) * 1.25;
      camera.position.set(center.x, center.y, center.z + distance);
      camera.near = distance / 100;
      camera.far = distance * 5;
      camera.updateProjectionMatrix();
      controls.target.copy(center);
      controls.minDistance = distance * 0.4;
      controls.maxDistance = distance * 2.5;
      controls.update();
      resize();
      setState("ready");
    }).catch(() => { if (!disposed) setState("error"); });

    return () => {
      disposed = true;
      observer.disconnect();
      themeObserver.disconnect();
      controls.dispose();
      draco.dispose();
      cancelAnimationFrame(frame);
      model?.traverse((object) => { if (object instanceof Mesh) object.geometry.dispose(); });
      Object.values(materials).forEach((material) => material.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [muscle, secondaryMuscles]);

  return (
    <div>
      <MuscleIllustration muscle={muscle} secondaryMuscles={secondaryMuscles} className="sr-only" />
      <div className="relative h-[min(60dvh,32rem)] overflow-hidden rounded-xl border bg-muted/20">
        <div ref={container} aria-hidden="true" data-vaul-no-drag className="size-full" />
        {state === "loading" ? <p role="status" className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">{t("Loading 3D anatomy...")}</p> : null}
        {state === "error" ? <p role="alert" className="absolute inset-0 grid place-items-center p-4 text-center text-sm">{t("3D anatomy could not load. The 2D muscle map is still available.")}</p> : null}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{t("Drag to rotate. Pinch or scroll to zoom.")}</p>
      <p className="mt-2 text-sm">{t("Primary")}: {t(muscleLabels[muscle])}{secondaryMuscles.length ? ` · ${t("Secondary")}: ${secondaryMuscles.map((item) => t(muscleLabels[item])).join(", ")}` : ""}</p>
      <a href="https://dbarchive.biosciencedbc.jp/en/bodyparts3d/" target="_blank" rel="noreferrer" className="mt-2 block text-xs text-muted-foreground underline">{t("Anatomy: BodyParts3D, © DBCLS, CC BY 4.0")}</a>
    </div>
  );
}
