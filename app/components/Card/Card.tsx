import { CardBaseData } from "@/app/models/CardBaseData";
import { useMediaModal } from "../Modal/MediaModalContext/MediaModalContext";
import { useRouter } from "next/navigation";
import "./Card.css";

type Props = {
  media: CardBaseData;
  selected?: boolean;
};

export default function Card({ media, selected = false }: Props) {
  const { open } = useMediaModal();
  const router = useRouter();

  function handleClick() {
    switch (media.kind) {
      case "media":
        open(media);
        break;

      case "genre":
        router.push(`/browse/genre/${media.id}`);
        break;

      case "platform":
        router.push(`/browse/platform/${media.id}`);
        break;
    }
  }

  return (
    <div
      className={`card ${selected ? "card--selected" : ""}`}
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => e.key === "Enter" && handleClick()}
    >
      {media.posterUrl ? (
        <div className="card__image">
          <img src={media.posterUrl} alt={media.title} loading="lazy" />
        </div>
      ) : (
        <div className="card__textOnly">{media.title}</div>
      )}

      {media.posterUrl && (
        <div className="card__body">
          <div className="card__title">{media.title}</div>
          {media.year && <div className="card__subtitle">{media.year}</div>}
        </div>
      )}
    </div>
  );
}
