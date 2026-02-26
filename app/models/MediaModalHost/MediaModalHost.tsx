"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import MediaModal from "@/app/components/Modal/MediaModal/MediaModal";
import { useMediaModal } from "@/app/components/Modal/MediaModalContext/MediaModalContext";
import { consumePendingModalMedia } from "@/app/play/playNavigation";


export default function MediaModalHost() {
  const pathname = usePathname();
  const search = useSearchParams();
  const { media, close, open } = useMediaModal();

  useEffect(() => {
    if (media) return;

    const pendingMedia = consumePendingModalMedia();
    if (pendingMedia) {
      open(pendingMedia);
    }
  }, [pathname, search, media, open]);

  return (
    <MediaModal
      open={!!media}
      media={media}
      onClose={close}
    />
  );
}
