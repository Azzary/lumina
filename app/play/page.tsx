"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSearch } from "../Search/SearchContext";
import { AppConfig } from "../config/app.config";

type State = "waiting" | "ready" | "error";

export default function PlayPage() {
  const params = useSearchParams();
  const router = useRouter();
  const { setQuery } = useSearch();

  const path = params.get("path");
  const title = params.get("title");

  const [state, setState] = useState<State>("waiting");
  const [progress, setProgress] = useState(0);

  const [showControls, setShowControls] = useState(true);
  const hideTimer = useRef<number | null>(null);

  const statusUrl =
    `${AppConfig.servers.download.baseUrl}` +
    `/api/stream/status?path=${encodeURIComponent(path ?? "")}`;

  const streamUrl =
    `${AppConfig.servers.download.baseUrl}` +
    `/api/stream?path=${encodeURIComponent(path ?? "")}`;

  useEffect(() => {
    setQuery("");
  }, [setQuery]);

  useEffect(() => {
    if (!path) return;

    let alive = true;

    const poll = async () => {
      try {
        const res = await fetch(statusUrl);
        const data = await res.json();

        if (!alive) return;

        if (data.ready) {
          setState("ready");
        } else {
          setProgress(data.progress ?? 0);
          setTimeout(poll, 1000);
        }
      } catch {
        if (alive) setState("error");
      }
    };

    poll();
    return () => { alive = false; };
  }, [path, statusUrl]);

  const revealControls = () => {
    setShowControls(true);

    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
    }

    hideTimer.current = window.setTimeout(() => {
      setShowControls(false);
    }, 2500);
  };

  useEffect(() => {
    revealControls();
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  if (!path) {
    return (
      <div style={{ color: "white", padding: 24 }}>
        Fichier introuvable
      </div>
    );
  }

  return (
    <div
      tabIndex={0}
      onMouseMove={revealControls}
      onKeyDown={revealControls}
      style={{
        position: "fixed",
        inset: 0,
        background: "black",
        overflow: "hidden",
      }}
    >
      {state !== "ready" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            gap: "16px",
          }}
        >
          <p>
            {state === "waiting"
              ? "Préparation de la vidéo…"
              : "Erreur lors du chargement"}
          </p>

          {state === "waiting" && (
            <>
              <div
                style={{
                  width: "60%",
                  height: "8px",
                  background: "#222",
                  borderRadius: "4px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${progress}%`,
                    background: "#4caf50",
                    transition: "width 0.3s linear",
                  }}
                />
              </div>

              <span style={{ fontSize: "14px", opacity: 0.8 }}>
                {progress}%
              </span>
            </>
          )}
        </div>
      )}

      {state === "ready" && (
        <video
          src={streamUrl}
          autoPlay
          controls
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            background: "black",
          }}
        />
      )}

      {showControls && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            padding: "16px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.7), rgba(0,0,0,0))",
          }}
        >
          <button
            onClick={() => router.back()}
            style={{
              padding: "8px 14px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              background: "rgba(255,255,255,0.15)",
              color: "white",
            }}
          >
            ← Retour
          </button>

          {title && (
            <span
              style={{
                marginLeft: "8px",
                fontSize: "14px",
                opacity: 0.85,
              }}
            >
              {title}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
