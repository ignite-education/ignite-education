import React, { useEffect, useRef, useState } from 'react';

/** Longest we wait for the embed's load event before showing it anyway. */
const EMBED_REVEAL_TIMEOUT = 2000;

/**
 * `load` fires when the embed document is done, but the player paints its poster
 * a beat after that. Revealing on `load` alone shows the iframe's black
 * background over the thumbnail for a frame or two.
 */
const PLAYER_SETTLE_MS = 250;

/**
 * Poster candidates, best first. `maxresdefault` is 1280x720 but is missing for
 * plenty of videos (one of the three in the current courses 404s); `mqdefault` is
 * only 320x180 but always exists. Both are true 16:9 — `hqdefault` is 4:3 with
 * letterboxing baked in, which would show as black bars inside the 16:9 frame.
 */
const POSTER_QUALITIES = ['maxresdefault', 'mqdefault'];

const SectionYouTube = ({ section }) => {
  const videoData = section.content || {};
  const videoId = videoData.videoId;

  // The embed is fetched over the network, so the surrounding panel's crossfade
  // would otherwise reveal an empty player that fills in a beat later. We show
  // YouTube's own thumbnail underneath and hold the iframe at zero until its
  // player has painted — both show the same image, so the swap is invisible.
  const [posterUrl, setPosterUrl] = useState(null);
  const [playerReady, setPlayerReady] = useState(false);
  const revealTimeoutRef = useRef(null);
  const settleTimeoutRef = useRef(null);

  useEffect(() => {
    setPlayerReady(false);
    if (!videoId) return undefined;

    // A blocked or failed embed may never fire `load`. Reveal it regardless
    // rather than leave an invisible video on the screen.
    revealTimeoutRef.current = setTimeout(() => setPlayerReady(true), EMBED_REVEAL_TIMEOUT);
    return () => {
      clearTimeout(revealTimeoutRef.current);
      clearTimeout(settleTimeoutRef.current);
    };
  }, [videoId]);

  useEffect(() => {
    setPosterUrl(null);
    if (!videoId) return undefined;

    let cancelled = false;
    const tryQuality = (i) => {
      if (cancelled || i >= POSTER_QUALITIES.length) return;
      const img = new Image();
      img.onload = () => {
        if (cancelled) return;
        // A missing thumbnail can come back as a tiny grey placeholder rather
        // than a 404, so size is the reliable tell.
        if (img.naturalWidth <= 120) return tryQuality(i + 1);
        setPosterUrl(img.src);
      };
      img.onerror = () => tryQuality(i + 1);
      img.src = `https://i.ytimg.com/vi/${videoId}/${POSTER_QUALITIES[i]}.jpg`;
    };
    tryQuality(0);

    return () => { cancelled = true; };
  }, [videoId]);

  if (!videoId) return null;

  return (
    <div className="mb-6">
      {videoData.title && (
        <h3 className="text-lg mb-1" style={{ fontWeight: 500, letterSpacing: '-0.01em' }}>{videoData.title}</h3>
      )}
      {videoData.description && (
        <p className="text-base font-light leading-relaxed mb-3 text-black" style={{ letterSpacing: '-0.01em' }}>{videoData.description}</p>
      )}
      <div
        className="aspect-video rounded-lg overflow-hidden"
        style={{
          backgroundImage: posterUrl ? `url("${posterUrl}")` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <iframe
          src={`https://www.youtube.com/embed/${videoId}${videoData.startTime ? `?start=${videoData.startTime}` : ''}`}
          title={videoData.title || 'YouTube video'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          onLoad={() => {
            clearTimeout(revealTimeoutRef.current);
            settleTimeoutRef.current = setTimeout(() => setPlayerReady(true), PLAYER_SETTLE_MS);
          }}
          className="w-full h-full rounded-lg"
          style={{
            opacity: playerReady ? 1 : 0,
            transition: 'opacity 300ms ease-out',
          }}
        />
      </div>
    </div>
  );
};

export default SectionYouTube;
