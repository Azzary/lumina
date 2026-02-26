"use client";

import { useEffect, useMemo, useState } from "react";
import { AppConfig } from "@/app/config/app.config";
import "./UserGate.css";

const USER_COOKIE = "lumi_username";
const USER_SESSION_KEY = "lumi_selected_username";

type StreamUser = {
  id: number;
  username: string;
  created_at: string;
};

type StreamUsersResponse = {
  items: StreamUser[];
};

function writeSessionCookie(name: string, value: string): void {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; samesite=lax`;
}

export default function UserGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const apiBase = AppConfig.servers.download.baseUrl;

  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<StreamUser[]>([]);
  const [usernameInput, setUsernameInput] = useState("");
  const [error, setError] = useState("");

  const uniqueUsers = useMemo(() => {
    const out: StreamUser[] = [];
    const seen = new Set<string>();
    for (const user of users) {
      const key = user.username.trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(user);
    }
    return out;
  }, [users]);

  useEffect(() => {
    const selected = window.sessionStorage.getItem(USER_SESSION_KEY);
    if (selected && selected.trim()) {
      writeSessionCookie(USER_COOKIE, selected.trim());
      setReady(true);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const loadUsers = async () => {
      try {
        const res = await fetch(`${apiBase}/api/stream/users?limit=200`, {
          cache: "no-store",
        });
        if (!res.ok) {
          throw new Error("cannot load users");
        }
        const data = (await res.json()) as StreamUsersResponse;
        if (!cancelled) {
          setUsers(data.items ?? []);
        }
      } catch {
        if (!cancelled) {
          setUsers([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadUsers();

    return () => {
      cancelled = true;
    };
  }, [apiBase]);

  const activateUser = async (candidate: string) => {
    const username = candidate.trim();
    if (!username) {
      setError("Username requis");
      return;
    }

    try {
      const res = await fetch(`${apiBase}/api/stream/user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });

      if (!res.ok) {
        throw new Error("cannot create/select user");
      }

      const data = (await res.json()) as { username?: string };
      const finalUsername =
        typeof data.username === "string" && data.username.trim()
          ? data.username.trim()
          : username;

      window.sessionStorage.setItem(USER_SESSION_KEY, finalUsername);
      writeSessionCookie(USER_COOKIE, finalUsername);
      setReady(true);
      setError("");
    } catch {
      setError("Impossible de valider cet utilisateur");
    }
  };

  if (ready) {
    return <>{children}</>;
  }

  return (
    <div className="userGate">
      <div className="userGate__panel">
        <h2 className="userGate__title">Qui regarde ?</h2>

        <div className="userGate__list scrollbar">
          {uniqueUsers.map((user) => (
            <button
              key={user.id}
              className="userGate__card"
              onClick={() => void activateUser(user.username)}
              disabled={loading}
            >
              <span>{user.username}</span>
            </button>
          ))}

          {!loading && uniqueUsers.length === 0 && (
            <div className="userGate__empty">
              Aucun utilisateur pour le moment
            </div>
          )}
        </div>

        <div className="userGate__create">
          <input
            className="userGate__input"
            value={usernameInput}
            onChange={(e) => setUsernameInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                void activateUser(usernameInput);
              }
            }}
            placeholder="Nouveau username"
          />

          <button
            className="userGate__createBtn"
            onClick={() => void activateUser(usernameInput)}
            disabled={loading}
          >
            Continuer
          </button>
        </div>

        {error && <div className="userGate__error">{error}</div>}
      </div>
    </div>
  );
}
