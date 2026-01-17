"use client";

import { useSearch } from "@/app/Search/SearchContext";
import "./TopBar.css";
import { useEffect, useState } from "react";

export default function TopBar({
  placeholder = "Rechercher un film, une série…",
}) {
  const { setQuery } = useSearch();
  const [value, setValue] = useState("");

  useEffect(() => {
    const q = value.trim();
    const t = setTimeout(() => {
      setQuery(q.length >= 2 ? q : "");
    }, 300);

    return () => clearTimeout(t);
  }, [value]);

  return (
    <header className="topBar">
      <div className="topBar__container">
        <div className="topBar__left">
          <img
            className="topBar__logo"
            src="/logo.png"
            alt="Lumina"
            onClick={() => (window.location.href = "/")}
          />
        </div>

        <div className="topBar__center">
          <input
            className="topBar__input"
            placeholder={placeholder}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>

        <div className="topBar__right" />
      </div>
    </header>
  );
}
