import { ExternalLink } from "lucide-react";

export function VideoPlayer({
  youtubeId,
  title,
  videoUrl,
}: {
  youtubeId: string;
  title: string;
  videoUrl: string;
}) {
  return (
    <div className="space-y-3">
      <div className="glass-panel overflow-hidden rounded-3xl p-1.5">
        <div
          className="relative w-full overflow-hidden rounded-[1.15rem]"
          style={{ aspectRatio: "16 / 9" }}
        >
          <iframe
            className="absolute inset-0 h-full w-full"
            src={`https://www.youtube.com/embed/${youtubeId}`}
            title={title}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
      <a
        href={videoUrl}
        target="_blank"
        rel="noreferrer"
        className="press inline-flex items-center gap-2 rounded-full border border-glass-border bg-glass px-4 py-2 text-sm font-semibold transition-colors hover:text-primary"
      >
        <ExternalLink className="h-4 w-4" />
        Открыть на YouTube
      </a>
    </div>
  );
}
