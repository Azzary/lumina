"use client";

import { createContext, useContext, useState } from "react";

type MediaModalContextType = {
  open: (media: any) => void;
  close: () => void;
  media: any | null;
};

const MediaModalContext = createContext<MediaModalContextType | null>(null);

export function MediaModalProvider({ children }: { children: React.ReactNode }) {
  const [media, setMedia] = useState<any | null>(null);

  return (
    <MediaModalContext.Provider
      value={{
        media,
        open: setMedia,
        close: () => setMedia(null),
      }}
    >
      {children}
    </MediaModalContext.Provider>
  );
}

export function useMediaModal() {
  const ctx = useContext(MediaModalContext);
  if (!ctx) {
    throw new Error("useMediaModal must be used inside MediaModalProvider");
  }
  return ctx;
}
