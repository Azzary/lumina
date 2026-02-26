"use client";

import { MediaDetails } from "@/app/models/MediaDetails";
import "./MediaFrame.css";
import { CardBaseData } from "@/app/models/CardBaseData";


export default function MediaFrame({ media, runTrailer, mediaDetail, onClose }: {media: CardBaseData, runTrailer: boolean; mediaDetail: MediaDetails | null; onClose: () => void;}) {
  console.log(mediaDetail);

  return (
    <div className="player__container">
      {runTrailer ? (
          <iframe
            width="100%"
            height="100%"
            allow="autoplay; encrypted-media"
            src={
              `https://www.youtube.com/embed/${mediaDetail?.trailerYoutubeKey}`
              + `?autoplay=1`
              + `&playsinline=1`
              + `&modestbranding=1`
              + `&controls=0`
              + `&rel=0`
              + `&showinfo=0`
            }
          />
      ) : (

    <div className="media__poster">
      <img
        className="media__poster__image"
        src={media.backdropUrl ?? ""}
      />
      <div className="media__poster__title">
        {media.title}
      </div>
    </div>


      )}
    </div>

  );
}
