import React from 'react';

const SectionYouTube = ({ section }) => {
  const videoData = section.content || {};
  const videoId = videoData.videoId;
  if (!videoId) return null;

  return (
    <div className="mb-6">
      {videoData.title && (
        <h3 className="text-lg mb-1" style={{ fontWeight: 500, letterSpacing: '-0.01em' }}>{videoData.title}</h3>
      )}
      {videoData.description && (
        <p className="text-base font-light leading-relaxed mb-3 text-black" style={{ letterSpacing: '-0.01em' }}>{videoData.description}</p>
      )}
      <div className="aspect-video">
        <iframe
          src={`https://www.youtube.com/embed/${videoId}${videoData.startTime ? `?start=${videoData.startTime}` : ''}`}
          title={videoData.title || 'YouTube video'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full rounded-lg"
        />
      </div>
    </div>
  );
};

export default SectionYouTube;
