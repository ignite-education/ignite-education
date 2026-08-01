import React, { useState } from 'react';
import { MoveUp, MoveDown, Trash2, Settings2, Pin, AlertTriangle, CircleSlash, Undo2, Image as ImageIcon, Youtube, Pen } from 'lucide-react';
import SectionImage from '@shared/lesson/renderers/SectionImage';
import SectionYouTube from '@shared/lesson/renderers/SectionYouTube';
import SectionSVG from '@shared/lesson/renderers/SectionSVG';

const ICONS = { image: ImageIcon, youtube: Youtube, svg: Pen };

const describe = (section) => {
  const c = section.content || {};
  if (section.content_type === 'image') return c.url ? c.url.split('/').pop() : 'no image chosen';
  if (section.content_type === 'youtube') return c.videoId ? `youtube.com/${c.videoId}` : 'no video id';
  if (section.content_type === 'svg') return c.markup ? `${c.width || 200}×${c.height || 200}px` : 'no markup yet';
  return '';
};

const renderMedia = (section) => {
  if (section.content_type === 'image') return <SectionImage section={section} />;
  if (section.content_type === 'youtube') return <SectionYouTube section={section} />;
  // `live` re-injects markup as it's typed; the player leaves it off so
  // animations don't restart on re-render.
  if (section.content_type === 'svg') return <SectionSVG section={section} live />;
  return null;
};

const MediaCard = ({ section, shown, controls, settings, open }) => {
  const [hovered, setHovered] = useState(false);
  const Icon = ICONS[section.content_type] || ImageIcon;
  const persists = !!section.content?.persist;

  return (
    <div
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      // minWidth:0 lets the card shrink with its column; without it the
      // intrinsic width of the header row keeps it from ever narrowing.
      style={{ marginBottom: 16, minWidth: 0, maxWidth: '100%' }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute"
        style={{
          inset: -8,
          borderRadius: 6,
          outline: hovered ? '1px solid #DCDCDC' : '1px solid transparent',
          transition: 'outline-color 0.12s ease',
        }}
      />

      <div
        className="flex items-center justify-between"
        style={{ marginBottom: 6, fontSize: '0.7rem', color: '#8A8A8A', letterSpacing: '-0.01em' }}
      >
        <span className="flex items-center gap-1.5 min-w-0">
          <Icon size={11} />
          <span style={{ fontWeight: 500, textTransform: 'capitalize' }}>{section.content_type}</span>
          <span className="truncate">{describe(section)}</span>
          {persists && (
            <span className="flex items-center gap-0.5 flex-shrink-0" style={{ color: '#8200EA' }}>
              <Pin size={10} /> persists
            </span>
          )}
        </span>

        <span
          className="flex items-center gap-0.5 flex-shrink-0"
          style={{
            opacity: hovered || open ? 1 : 0,
            transition: 'opacity 0.12s ease',
            pointerEvents: hovered || open ? 'auto' : 'none',
          }}
        >
          {controls}
        </span>
      </div>

      {shown ? (
        renderMedia(section)
      ) : (
        <div
          className="flex items-center gap-1.5"
          style={{
            border: '1px dashed #D8D8D8', borderRadius: 6, padding: '8px 10px',
            fontSize: '0.7rem', color: '#EF0B72', background: 'rgba(255,255,255,0.5)',
          }}
        >
          <AlertTriangle size={11} />
          Not shown — students only see the first media item on a screen
        </div>
      )}

      {open && settings}
    </div>
  );
};

/**
 * Marks the screen where an author stopped carried-forward media early.
 *
 * Without it, `persist` media runs until some later screen introduces media of
 * its own — so a diagram could follow the student far past where it's relevant.
 */
const MediaStop = ({ onUndo }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="flex flex-col items-center gap-1.5"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span
        className="flex items-center gap-1.5 text-xs"
        style={{
          color: '#8A8A8A',
          border: '1px dashed #D8D8D8',
          borderRadius: 999,
          padding: '3px 10px',
          background: 'rgba(255,255,255,0.5)',
        }}
      >
        <CircleSlash size={11} />
        media ends here
      </span>
      <button
        onClick={onUndo}
        className="text-xs text-gray-400 hover:text-gray-800 transition flex items-center gap-1"
        style={{ opacity: hovered ? 1 : 0, transition: 'opacity 0.12s ease' }}
        title="Let the media carry on to this screen again"
      >
        <Undo2 size={11} /> undo
      </button>
    </div>
  );
};

/**
 * The right-hand media column.
 *
 * Media blocks live in the flat block order but students never see them in the
 * text flow — `ContentRenderer` returns null for image/youtube/svg and they
 * render here instead. So this is where they're edited too, rather than via a
 * stand-in card in the text column.
 *
 * A screen shows exactly one media item. Any extras are listed here flagged as
 * not shown, and a screen with none displays whichever earlier `persist` item
 * is still carrying, dimmed and read-only since it belongs to another screen.
 */
const MediaRail = ({
  ownMedia,
  resolved,
  indexById,
  blockCount,
  endsHere,
  onEndMedia,
  onResumeMedia,
  onMoveUp,
  onMoveDown,
  onRemove,
  renderSettings,
}) => {
  const [openId, setOpenId] = useState(null);
  const shownId = resolved.section?.id ?? null;

  if (ownMedia.length === 0) {
    // This screen is where the author stopped the carried-forward media.
    if (endsHere) {
      return (
        <MediaStop onUndo={onResumeMedia} />
      );
    }

    if (!resolved.section) return null;

    return (
      <div>
        <div style={{ opacity: 0.5 }}>{renderMedia(resolved.section)}</div>
        <div
          className="flex items-center gap-2 flex-wrap"
          style={{ marginTop: 8, justifyContent: 'center' }}
        >
          <span
            className="flex items-center gap-1"
            style={{ fontSize: '0.7rem', fontWeight: 500, letterSpacing: '-0.01em', color: '#8200EA' }}
          >
            <Pin size={10} />
            persisting from screen {resolved.fromGroupIndex + 1}
          </span>
          <button
            onClick={onEndMedia}
            className="text-xs text-gray-400 hover:text-gray-800 transition"
            title="Stop showing this media from this screen onward"
          >
            end here
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {ownMedia.map((section) => {
        const flatIndex = indexById.get(section.id);
        const controls = (
          <>
            <button
              onClick={() => onMoveUp(flatIndex)}
              disabled={flatIndex === 0}
              title="Move up"
              className="p-1 rounded hover:bg-white/70 disabled:opacity-25 text-gray-500"
            >
              <MoveUp size={12} />
            </button>
            <button
              onClick={() => onMoveDown(flatIndex)}
              disabled={flatIndex === blockCount - 1}
              title="Move down"
              className="p-1 rounded hover:bg-white/70 disabled:opacity-25 text-gray-500"
            >
              <MoveDown size={12} />
            </button>
            <button
              onClick={() => setOpenId((id) => (id === section.id ? null : section.id))}
              title="Media settings"
              className={`p-1 rounded hover:bg-white/70 ${
                openId === section.id ? 'text-gray-900 bg-white/70' : 'text-gray-500'
              }`}
            >
              <Settings2 size={12} />
            </button>
            <button
              onClick={() => onRemove(section.id)}
              title="Delete"
              className="p-1 rounded hover:bg-red-50 text-gray-500 hover:text-red-600"
            >
              <Trash2 size={12} />
            </button>
          </>
        );

        return (
          <MediaCard
            key={section.id}
            section={section}
            shown={section.id === shownId}
            controls={controls}
            open={openId === section.id}
            settings={renderSettings?.(section)}
          />
        );
      })}
    </div>
  );
};

export default MediaRail;
