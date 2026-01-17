"use client";

import MediaModal from "@/app/components/Modal/MediaModal/MediaModal";
import { useMediaModal } from "@/app/components/Modal/MediaModalContext/MediaModalContext";


export default function MediaModalHost() {
  const { media, close } = useMediaModal();

  return (
    <MediaModal
      open={!!media}
      media={media}
      onClose={close}
    />
  );
}
