// src/ui/SketchFabModel.tsx

import { useEffect, useRef, useState } from "react";
import { SketchFabLoader } from "./SketchFabLoader";

// Extend Window to include Sketchfab API
declare global {
  interface Window {
    Sketchfab: any;
  }
}

export function SketchFabModel() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [progress, setProgress] = useState(0);
  const [active, setActive] = useState(true);

  useEffect(() => {
    const initSketchfab = () => {
      if (!iframeRef.current || !window.Sketchfab) return;

      const client = new window.Sketchfab("1.12.1", iframeRef.current);

      client.init("30523d6505db43a887eed8c040971146", {
        success: (api: any) => {
          api.start();

          api.addEventListener("modelLoadProgress", (factor: number) => {
            setProgress(Math.floor(factor * 100));
          });

          api.addEventListener("viewerready", () => {
            setProgress(100);
            setActive(false);

            // Tilt camera ~13° more front-facing
            api.getCameraLookAt((err: any, camera: any) => {
              if (err) return;
              const [px, py, pz] = camera.position;
              const [tx, ty, tz] = camera.target;

              const dx = px - tx;
              const dy = py - ty;
              const dz = pz - tz;

              const horizDist = Math.sqrt(dx * dx + dz * dz);
              const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
              const currentAngle = Math.atan2(dy, horizDist);
              const newAngle = currentAngle - (-13 * Math.PI) / 180;

              const newHorizDist = dist * Math.cos(newAngle);
              const scale = horizDist > 0 ? newHorizDist / horizDist : 1;

              api.setCameraLookAt(
                [tx + dx * scale, ty + dist * Math.sin(newAngle), tz + dz * scale],
                [tx, ty, tz],
                0
              );
            });
          });
        },
        error: (err: any) => {
          console.error("Sketchfab API error:", err);
          setProgress(100);
          setActive(false);
        },
        transparent: 1,
        ui_infos: 0,
        ui_controls: 0,
        ui_watermark: 0,
        ui_stop: 0,
        ui_inspector: 0,
        ui_ar: 0,
        ui_help: 0,
        ui_settings: 0,
        ui_vr: 0,
        ui_fullscreen: 0,
        ui_annotations: 0,
        ui_related: 0,
        ui_hint: 0,
        autostart: 1,
      });
    };

    // Dynamically load the Sketchfab Viewer API script if not already present
    if (window.Sketchfab) {
      initSketchfab();
    } else {
      const script = document.createElement("script");
      script.src = "https://static.sketchfab.com/api/sketchfab-viewer-1.12.1.js";
      script.async = true;
      script.onload = initSketchfab;
      document.body.appendChild(script);
    }
  }, []);

  return (
    <div className="relative w-full h-[350px] lg:h-[600px]">
      {/* Show loader only while loading is active */}
      <SketchFabLoader progress={progress} active={active} />

      <div
        className="sketchfab-embed-wrapper w-full h-[290px] lg:h-[542px] relative overflow-hidden pointer-events-auto"
      >
        <iframe
          ref={iframeRef}
          title="Cozy Isometric Room"
          allowFullScreen
          allow="autoplay; fullscreen; xr-spatial-tracking"
          className="absolute left-0 w-full -top-[48px] lg:-top-[50px] bottom-[100px] h-[390px] lg:h-[650px] border-none"
          style={{
            background: "#F9F9FB",
          }}
        />
      </div>
    </div>
  );
}
