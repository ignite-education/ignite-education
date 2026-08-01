import React, { useRef, useState } from 'react';
import { Upload, Sparkles, Loader2 } from 'lucide-react';

const field =
  'w-full px-2 py-1.5 bg-white border border-gray-200 rounded-md text-xs text-gray-900 placeholder-gray-400 focus:border-pink-500 focus:outline-none';
const labelCls = 'block text-xs font-medium text-gray-500 mb-1';

/**
 * Advanced settings for a media block, expanded under its card in the rail.
 *
 * Everything here previously lived only in the Blocks view, which meant adding
 * an image on the canvas left you with a block you couldn't point at a file.
 */
const MediaSettings = ({
  section,
  onChange,
  onUploadImage,
  onGenerateSvg,
  generatingSvg,
  svgPrompt,
  onSvgPromptChange,
  onUseSectionContent,
}) => {
  const content = section.content || {};
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const set = (patch) => onChange({ ...content, ...patch });

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await onUploadImage(file);
      if (url) set({ url });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div
      className="space-y-2.5"
      style={{
        marginTop: 8,
        padding: 10,
        borderRadius: 6,
        background: 'rgba(255,255,255,0.7)',
        border: '1px solid #E6E6E6',
      }}
    >
      {section.content_type === 'image' && (
        <>
          <div>
            <span className={labelCls}>Image file</span>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={content.url || ''}
                onChange={(e) => set({ url: e.target.value })}
                placeholder="Paste a URL, or upload"
                className={field}
              />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex-shrink-0 px-2 py-1.5 border border-gray-200 rounded-md hover:bg-gray-100 text-xs text-gray-700 flex items-center gap-1 disabled:opacity-50"
              >
                {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                {uploading ? '…' : 'Upload'}
              </button>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
            </div>
          </div>
          <div>
            <span className={labelCls}>Alt text</span>
            <input
              type="text"
              value={content.alt || ''}
              onChange={(e) => set({ alt: e.target.value })}
              placeholder="Describes the image for screen readers"
              className={field}
            />
          </div>
          <div>
            <span className={labelCls}>Caption</span>
            <input
              type="text"
              value={content.caption || ''}
              onChange={(e) => set({ caption: e.target.value })}
              placeholder="Small italic line under the image"
              className={field}
            />
          </div>
        </>
      )}

      {section.content_type === 'youtube' && (
        <>
          <div>
            <span className={labelCls}>YouTube video ID</span>
            <input
              type="text"
              value={content.videoId || ''}
              onChange={(e) => {
                // Accept a full URL and pull the id out of it.
                const raw = e.target.value.trim();
                const m = raw.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/);
                set({ videoId: m ? m[1] : raw });
              }}
              placeholder="dQw4w9WgXcQ — or paste the full URL"
              className={field}
            />
          </div>
          <div>
            <span className={labelCls}>Title</span>
            <input
              type="text"
              value={content.title || ''}
              onChange={(e) => set({ title: e.target.value })}
              placeholder="Shown above the player"
              className={field}
            />
          </div>
        </>
      )}

      {section.content_type === 'svg' && (
        <>
          <div>
            <span className={labelCls}>Describe the icon</span>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={svgPrompt || ''}
                onChange={(e) => onSvgPromptChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (svgPrompt || '').trim() && !generatingSvg) onGenerateSvg();
                }}
                placeholder={content.markup ? 'e.g. make it more abstract' : 'e.g. a lightbulb with gears inside'}
                className={field}
              />
              <button
                onClick={onUseSectionContent}
                title="Use this section's text as the prompt"
                className="flex-shrink-0 px-2 py-1.5 border border-gray-200 rounded-md hover:bg-gray-100 text-xs text-gray-700 whitespace-nowrap"
              >
                Use section
              </button>
              <button
                onClick={onGenerateSvg}
                disabled={!(svgPrompt || '').trim() || generatingSvg}
                className="flex-shrink-0 px-2 py-1.5 border border-purple-200 bg-purple-50 rounded-md hover:bg-purple-100 text-xs text-purple-700 flex items-center gap-1 disabled:opacity-50"
              >
                {generatingSvg ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                {generatingSvg ? '…' : content.markup ? 'Edit' : 'Generate'}
              </button>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <span className={labelCls}>Size</span>
              <div className="flex gap-1">
                {[['S', 100], ['M', 200], ['L', 300], ['XL', 400], ['XXL', 500]].map(([lbl, px]) => (
                  <button
                    key={lbl}
                    onClick={() => set({ width: String(px), height: String(px) })}
                    className={`px-1.5 py-1 rounded text-xs border transition ${
                      String(content.width) === String(px)
                        ? 'bg-gray-900 text-white border-gray-900'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <details>
            <summary className="text-xs text-gray-500 cursor-pointer">SVG markup</summary>
            <textarea
              value={content.markup || ''}
              onChange={(e) => set({ markup: e.target.value })}
              rows={6}
              spellCheck={false}
              placeholder="<svg …>"
              className={`${field} font-mono`}
              style={{ marginTop: 6, resize: 'vertical' }}
            />
          </details>
        </>
      )}

      <div>
        <span className={labelCls}>Description</span>
        <input
          type="text"
          value={content.description || ''}
          onChange={(e) => set({ description: e.target.value })}
          placeholder="Body text shown under the media"
          className={field}
        />
      </div>

      <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
        <input
          type="checkbox"
          checked={!!content.persist}
          onChange={(e) => set({ persist: e.target.checked })}
          className="accent-pink-500"
        />
        Keep showing on following screens
      </label>
    </div>
  );
};

export default MediaSettings;
