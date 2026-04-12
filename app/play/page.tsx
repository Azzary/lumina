"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSearch } from "../Search/SearchContext";
import { AppConfig } from "../config/app.config";
import "./play.css";
import { prepareModalReopenFromPlayer } from "./playNavigation";

type State = "waiting" | "ready" | "error";

type EpisodeLink = {
  season: number | null;
  episode: number | null;
  title: string;
  path: string;
};

type StreamContextResponse = {
  navigation: {
    show_path: string;
    current: EpisodeLink;
    previous: EpisodeLink | null;
    next: EpisodeLink | null;
  };
  progress: {
    position_seconds: number;
    duration_seconds: number | null;
    updated_at: string;
  } | null;
};

const USER_COOKIE = "lumi_username";
const AUTO_NEXT_STORAGE = "lumi_auto_next";

function readCookie(name: string): string | null {
  const cookies = document.cookie.split(";").map((c) => c.trim());
  for (const cookie of cookies) {
    const [key, ...rest] = cookie.split("=");
    if (key === name) {
      return decodeURIComponent(rest.join("="));
    }
  }
  return null;
}

function writeCookie(name: string, value: string): void {
  document.cookie = `${name}=${encodeURIComponent(
    value
  )}; path=/; max-age=31536000; samesite=lax`;
}

function formatClock(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;

  const mm = String(minutes).padStart(2, "0");
  const ss = String(secs).padStart(2, "0");

  if (hours > 0) {
    return `${hours}:${mm}:${ss}`;
  }

  return `${mm}:${ss}`;
}

function resolveStreamBaseUrl(proxyBaseUrl: string): string {
  const configured = AppConfig.servers.download.streamBaseUrl;
  if (configured) {
    return configured;
  }

  if (typeof window === "undefined") {
    return proxyBaseUrl;
  }

  const { hostname, protocol } = window.location;
  return `${protocol}//${hostname}:8585`;
}

export default function PlayPage() {
  const params = useSearchParams();
  const router = useRouter();
  const { setQuery } = useSearch();

  const path = params.get("path") ?? "";
  const title = params.get("title");
  const tmdbIdParam = params.get("tmdb_id");
  const mediaTypeParam = params.get("media_type");
  const apiBase = AppConfig.servers.download.baseUrl;
  const streamBaseUrl = useMemo(
    () => resolveStreamBaseUrl(apiBase),
    [apiBase]
  );

  const [state, setState] = useState<State>("waiting");
  const [progress, setProgress] = useState(0);

  const [username, setUsername] = useState("");
  const [usernameInput, setUsernameInput] = useState("");
  const [needsUsername, setNeedsUsername] = useState(false);
  const [userError, setUserError] = useState("");

  const [context, setContext] = useState<StreamContextResponse | null>(null);
  const [autoNext, setAutoNext] = useState(true);
  const [resumeInfo, setResumeInfo] = useState("");
  const [endInfo, setEndInfo] = useState("");

  const [showControls, setShowControls] = useState(true);
  const hideTimer = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastProgressSaveAt = useRef(0);
  const resumeAppliedForPath = useRef<string>("");

  const statusUrl = useMemo(
    () =>
      `${apiBase}/api/stream/status?path=${encodeURIComponent(path)}`,
    [apiBase, path]
  );

  const streamUrl = useMemo(
    () =>
      `${streamBaseUrl}/api/stream?path=${encodeURIComponent(path)}`,
    [path, streamBaseUrl]
  );

  useEffect(() => {
    setQuery("");
  }, [setQuery]);

  useEffect(() => {
    const savedUsername = readCookie(USER_COOKIE);
    if (savedUsername) {
      setUsername(savedUsername);
      setUsernameInput(savedUsername);
      setNeedsUsername(false);
    } else {
      setNeedsUsername(true);
    }

    const savedAutoNext = window.localStorage.getItem(AUTO_NEXT_STORAGE);
    if (savedAutoNext !== null) {
      setAutoNext(savedAutoNext === "1");
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      AUTO_NEXT_STORAGE,
      autoNext ? "1" : "0"
    );
  }, [autoNext]);

  useEffect(() => {
    setState("waiting");
    setProgress(0);
    setContext(null);
    setResumeInfo("");
    setEndInfo("");
    resumeAppliedForPath.current = "";
  }, [path]);

  useEffect(() => {
    if (!path) return;

    let alive = true;
    let pollTimer: number | null = null;

    const poll = async () => {
      try {
        const res = await fetch(statusUrl, { cache: "no-store" });
        const data = await res.json();

        if (!alive) return;

        if (data.ready) {
          setState("ready");
        } else {
          setProgress(data.progress ?? 0);
          pollTimer = window.setTimeout(poll, 1000);
        }
      } catch {
        if (alive) {
          setState("error");
        }
      }
    };

    poll();

    return () => {
      alive = false;
      if (pollTimer !== null) {
        clearTimeout(pollTimer);
      }
    };
  }, [path, statusUrl]);

  useEffect(() => {
    if (!path) return;

    let alive = true;
    const query = new URLSearchParams({ path });
    if (username) {
      query.set("username", username);
    }

    const load = async () => {
      try {
        const res = await fetch(
          `${apiBase}/api/stream/context?${query.toString()}`,
          { cache: "no-store" }
        );
        if (!res.ok) {
          throw new Error("context error");
        }
        const data = (await res.json()) as StreamContextResponse;
        if (alive) {
          setContext(data);
        }
      } catch {
        if (alive) {
          setContext(null);
        }
      }
    };

    load();

    return () => {
      alive = false;
    };
  }, [apiBase, path, username]);

  useEffect(() => {
    if (!username) return;

    fetch(`${apiBase}/api/stream/user`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    }).catch(() => {});
  }, [apiBase, username]);

  const saveProgress = useCallback(
    async (forcedPosition?: number) => {
      if (!path || !username || !videoRef.current) return;

      const video = videoRef.current;
      const position = forcedPosition ?? video.currentTime ?? 0;
      const duration =
        Number.isFinite(video.duration) && video.duration > 0
          ? video.duration
          : null;
      const tmdbId = tmdbIdParam ? parseInt(tmdbIdParam, 10) : NaN;
      const mediaType =
        mediaTypeParam === "movie" || mediaTypeParam === "tv"
          ? mediaTypeParam
          : null;

      try {
        await fetch(`${apiBase}/api/stream/progress`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username,
            path,
            position_seconds: position,
            duration_seconds: duration,
            tmdb_id: Number.isFinite(tmdbId) ? tmdbId : null,
            media_type: mediaType,
            media_title: title ?? null,
          }),
        });
      } catch {
      }
    },
    [apiBase, mediaTypeParam, path, title, tmdbIdParam, username]
  );

  useEffect(() => {
    const onBeforeUnload = () => {
      void saveProgress();
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [saveProgress]);

  const registerUser = useCallback(async () => {
    const candidate = usernameInput.trim();
    if (!candidate) {
      setUserError("Username requis.");
      return;
    }

    try {
      const res = await fetch(`${apiBase}/api/stream/user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: candidate }),
      });

      if (!res.ok) {
        throw new Error("cannot create user");
      }

      const data = await res.json();
      const finalUsername =
        typeof data.username === "string"
          ? data.username
          : candidate;

      writeCookie(USER_COOKIE, finalUsername);
      setUsername(finalUsername);
      setNeedsUsername(false);
      setUserError("");
    } catch {
      setUserError("Impossible de creer cet utilisateur.");
    }
  }, [apiBase, usernameInput]);

  const revealControls = useCallback(() => {
    setShowControls(true);

    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
    }

    hideTimer.current = window.setTimeout(() => {
      setShowControls(false);
    }, 2500);
  }, []);

  useEffect(() => {
    revealControls();
    return () => {
      if (hideTimer.current) {
        clearTimeout(hideTimer.current);
      }
    };
  }, [revealControls]);

  const goToEpisode = useCallback(
    (episode: EpisodeLink | null) => {
      if (!episode) return;

      const nextTitle = episode.title || "Episode";
      const q = new URLSearchParams({
        path: episode.path,
        title: nextTitle,
      });
      if (tmdbIdParam) q.set("tmdb_id", tmdbIdParam);
      if (mediaTypeParam) q.set("media_type", mediaTypeParam);
      router.push(
        `/play?${q.toString()}`
      );
    },
    [mediaTypeParam, router, tmdbIdParam]
  );

  const openMediaSheet = useCallback(() => {
    const targetPath = prepareModalReopenFromPlayer();
    const currentPath = `${window.location.pathname}${window.location.search}`;

    if (targetPath && targetPath !== currentPath) {
      router.push(targetPath);
      return;
    }

    router.back();
  }, [router]);

  const applyResumeFromContext = useCallback(() => {
    const video = videoRef.current;
    if (!video || !path) return;
    if (resumeAppliedForPath.current === path) return;
    if (video.readyState < 1) return;

    const progress = context?.progress;
    if (!progress) return;

    const saved = Math.max(0, progress.position_seconds ?? 0);
    if (saved <= 5) {
      resumeAppliedForPath.current = path;
      return;
    }

    const duration =
      Number.isFinite(video.duration) && video.duration > 0
        ? video.duration
        : null;

    if (duration !== null && duration - saved <= 30) {
      resumeAppliedForPath.current = path;
      return;
    }

    const target =
      duration !== null
        ? Math.min(saved, Math.max(0, duration - 2))
        : saved;

    video.currentTime = target;
    setResumeInfo(`Reprise a ${formatClock(target)}`);
    resumeAppliedForPath.current = path;
  }, [context?.progress?.position_seconds, path]);

  const onLoadedMetadata = useCallback(() => {
    applyResumeFromContext();
  }, [applyResumeFromContext]);

  useEffect(() => {
    applyResumeFromContext();
  }, [applyResumeFromContext]);

  const onTimeUpdate = useCallback(() => {
    const now = Date.now();
    if (now - lastProgressSaveAt.current < 5000) return;

    lastProgressSaveAt.current = now;
    void saveProgress();
  }, [saveProgress]);

  const onPause = useCallback(() => {
    void saveProgress();
  }, [saveProgress]);

  const onEnded = useCallback(() => {
    if (videoRef.current) {
      void saveProgress(videoRef.current.duration || videoRef.current.currentTime);
    }

    if (autoNext && context?.navigation.next) {
      goToEpisode(context.navigation.next);
      return;
    }

    setEndInfo("Fin de saison");
  }, [autoNext, context?.navigation.next, goToEpisode, saveProgress]);

  if (!path) {
    return (
      <div style={{ color: "white", padding: 24 }}>
        Fichier introuvable
      </div>
    );
  }

  const savedPositionLabel = context?.progress
    ? `Position sauvegardee: ${formatClock(
        context.progress.position_seconds
      )}`
    : "";

  const currentTitle =
    context?.navigation.current.title || title || "Lecture";
  const isSeasonTransition =
    !!context?.navigation.current &&
    !!context?.navigation.next &&
    context.navigation.current.season !== null &&
    context.navigation.next.season !== null &&
    context.navigation.current.season !== context.navigation.next.season;

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
              ? "Preparation de la video..."
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
          ref={videoRef}
          src={streamUrl}
          autoPlay
          controls
          preload="auto"
          onLoadedMetadata={onLoadedMetadata}
          onTimeUpdate={onTimeUpdate}
          onPause={onPause}
          onEnded={onEnded}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            background: "black",
          }}
        />
      )}

      {showControls && (
        <div className="play__controls">
          <button
            onClick={openMediaSheet}
            className="play__btn play__btn--ghost"
          >
            Fiche
          </button>

          <button
            onClick={() => goToEpisode(context?.navigation.previous ?? null)}
            disabled={!context?.navigation.previous}
            className="play__btn"
          >
            Episode precedent
          </button>

          <button
            onClick={() => goToEpisode(context?.navigation.next ?? null)}
            disabled={!context?.navigation.next}
            className="play__btn play__btn--next"
          >
            Episode suivant
          </button>

          <label className="play__toggle">
            <input
              type="checkbox"
              checked={autoNext}
              onChange={(e) => setAutoNext(e.target.checked)}
            />
            Auto suivant
          </label>

          {username && (
            <span className="play__chip play__chip--user">
              {username}
            </span>
          )}

          <span className="play__title">
            {currentTitle}
          </span>

          {isSeasonTransition && (
            <span className="play__chip">
              Saison suivante apres cet episode
            </span>
          )}

          {!context?.navigation.next && (
            <span className="play__chip">
              Fin de saison
            </span>
          )}
        </div>
      )}

      {(resumeInfo || savedPositionLabel || endInfo) && showControls && (
        <div
          style={{
            position: "absolute",
            left: "16px",
            bottom: "20px",
            color: "white",
            fontSize: "13px",
            background: "rgba(0,0,0,0.4)",
            padding: "8px 10px",
            borderRadius: "8px",
          }}
        >
          {endInfo || resumeInfo || savedPositionLabel}
        </div>
      )}

      {needsUsername && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.75)",
            zIndex: 20,
            padding: "16px",
          }}
        >
          <div
            style={{
              width: "min(360px, 100%)",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              background: "#141414",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: "10px",
              padding: "16px",
              color: "white",
            }}
          >
            <span style={{ fontSize: "14px", opacity: 0.85 }}>
              Entre ton username
            </span>

            <input
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  void registerUser();
                }
              }}
              placeholder="username"
              style={{
                background: "#111",
                border: "1px solid rgba(255,255,255,0.25)",
                borderRadius: "8px",
                color: "white",
                padding: "10px",
              }}
            />

            <button
              onClick={() => void registerUser()}
              style={{
                padding: "10px",
                borderRadius: "8px",
                border: "none",
                cursor: "pointer",
                background: "#4caf50",
                color: "white",
                fontWeight: 600,
              }}
            >
              Valider
            </button>

            {userError && (
              <span style={{ color: "#ff8a8a", fontSize: "12px" }}>
                {userError}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
