import React from 'react';

const SectionYouTube = ({ section }) => {
  const videoData = section.content || {};
  const videoId = videoData.videoId;
  if (!videoId) return null;

  return (
    <div className="mb-6">
      {videoData.title && (
        <h3 className="text-lg font-bold mb-1">{videoData.title}</h3>
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
      {videoData.description && (
        <p className="text-base font-light leading-relaxed mt-3 text-black" style={{ letterSpacing: '-0.01em' }}>{videoData.description}</p>
      )}
    </div>
  );
};

export default SectionYouTube;
