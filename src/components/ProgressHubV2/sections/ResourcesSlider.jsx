import React, { useState, useRef, useEffect } from 'react';

const RESOURCES = [
  { id: 1, title: 'Resource 1', blurb: 'A short description of this resource will go here.' },
  { id: 2, title: 'Resource 2', blurb: 'A short description of this resource will go here.' },
  { id: 3, title: 'Resource 3', blurb: 'A short description of this resource will go here.' },
];

const CARD_WIDTH = 416;
const CARD_GAP = 16;

const ResourcesSlider = () => {
  const scrollContainerRef = useRef(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollStartX, setScrollStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [snappedCardIndex, setSnappedCardIndex] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);

  // Measure container width for right padding calculation
  useEffect(() => {
    if (!scrollContainerRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(scrollContainerRef.current);
    return () => observer.disconnect();
  }, []);

  // Drag scroll handlers
  const handleMouseDown = (e) => {
    if (!scrollContainerRef.current) return;
    setIsScrolling(true);
    setScrollStartX(e.pageX - scrollContainerRef.current.offsetLeft);
    setScrollLeft(scrollContainerRef.current.scrollLeft);
  };

  const handleMouseMove = (e) => {
    if (!isScrolling || !scrollContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - scrollStartX) * 2;
    scrollContainerRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUp = () => setIsScrolling(false);
  const handleMouseLeave = () => setIsScrolling(false);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const scrollPosition = scrollContainerRef.current.scrollLeft;
    let cumulativeWidth = 0;
    let index = 0;

    for (let i = 0; i < RESOURCES.length; i++) {
      if (scrollPosition < cumulativeWidth + CARD_WIDTH / 2) {
        index = i;
        break;
      }
      cumulativeWidth += CARD_WIDTH + CARD_GAP;
      if (i === RESOURCES.length - 1) index = i;
    }

    setSnappedCardIndex(index);
  };

  return (
    <div style={{ marginTop: '1.5rem', minHeight: '160px' }}>
      <h2 className="font-semibold text-white" style={{ fontSize: '1.6rem', letterSpacing: '-1%', marginBottom: '0.75rem' }}>
        Resources
      </h2>

      <div
        ref={scrollContainerRef}
        className="overflow-x-auto overflow-y-hidden select-none"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          scrollBehavior: 'smooth',
          WebkitOverflowScrolling: 'touch',
          cursor: isScrolling ? 'grabbing' : 'grab',
          scrollSnapType: 'x mandatory',
          scrollSnapStop: 'always',
          scrollPaddingLeft: '0px',
          willChange: 'scroll-position',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onScroll={handleScroll}
      >
        <div
          className="flex gap-4"
          style={{
            minHeight: '6.5rem',
            height: '6.5rem',
            paddingRight: containerWidth > 0 ? `${Math.max(0, containerWidth - CARD_WIDTH - CARD_GAP)}px` : '0px',
          }}
        >
          {RESOURCES.map((resource, index) => (
            <div
              key={resource.id}
              className="relative flex items-center"
              style={{
                width: `${CARD_WIDTH}px`,
                minWidth: `${CARD_WIDTH}px`,
                flexShrink: 0,
                paddingTop: '5.618px',
                paddingRight: '5.618px',
                paddingBottom: '5.618px',
                paddingLeft: '1.4rem',
                borderRadius: '0.3rem',
                background: '#7714E0',
                height: '6.5rem',
                scrollSnapAlign: 'start',
                scrollSnapStop: 'always',
              }}
            >
              {/* Blur overlay for non-snapped cards */}
              <div
                style={{
                  position: 'absolute',
                  top: 0, left: 0, right: 0, bottom: 0,
                  backgroundColor: index !== snappedCardIndex ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0)',
                  backdropFilter: index !== snappedCardIndex ? 'blur(0.75px)' : 'blur(0px)',
                  WebkitBackdropFilter: index !== snappedCardIndex ? 'blur(0.75px)' : 'blur(0px)',
                  borderRadius: '0.3rem',
                  pointerEvents: 'none',
                  transition: 'background-color 0.3s ease-in-out, backdrop-filter 0.3s ease-in-out',
                }}
              />
              <div className="flex-1">
                <h4 className="truncate text-white" style={{ marginBottom: '3px', fontSize: '1rem', fontWeight: 500, letterSpacing: '0%' }}>
                  {resource.title}
                </h4>
                <p className="text-white" style={{ fontSize: '0.9rem', fontWeight: 300, letterSpacing: '0%', lineHeight: '1.2' }}>
                  {resource.blurb}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ResourcesSlider;
