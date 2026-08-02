import React, { useMemo, useCallback } from 'react';
import {
  groupSectionsByHeading,
  selectGroupMedia,
  selectGroupSuggestedQuestion,
  selectGroupHeadings,
} from '@shared/lesson/groupSections';
import { toSections } from '@shared/lesson/blockAdapter';
import { isMediaType } from '@shared/lesson/blockTypes';
import CanvasBlock from './CanvasBlock';
import InsertPoint from './InsertPoint';
import ScreenBreak from './ScreenBreak';
import SuggestedQuestionEditor from './editable/SuggestedQuestionEditor';
import SuggestedQuestionStop from './SuggestedQuestionStop';
import InheritedHeadings from './InheritedHeadings';
import MediaRail from './MediaRail';
import MediaSettings from './drawers/MediaSettings';
import useCanvasScale from './useCanvasScale';

/**
 * WYSIWYG lesson canvas.
 *
 * Structurally this is a grid of screen-groups, not a flat list: rows come from
 * `groupSectionsByHeading` — the same function the student player paginates
 * with — so the left cell holds a screen's text, the right cell holds the one
 * media item that screen resolves to, and the divider below is a real Continue
 * press. 3fr/2fr mirrors the player's `flex-[3]` / `flex-[2]`.
 */
const LessonCanvas = ({
  contentBlocks,
  lessonName,
  lessonNumber,
  onMoveUp,
  onMoveDown,
  onRemove,
  onInsertAt,
  onUpdateContent,
  onUpdateBlock,
  onGenerateSuggested,
  onGenerateUser,
  generatingQuestionForId,
  onUploadImage,
  onGenerateSvg,
  onUseSectionContent,
  svgPrompts,
  onSvgPromptChange,
  generatingSvgId,
}) => {
  // Hold the student layout at a reference width and scale it to fit, rather
  // than letting the two columns reflow into something students never see.
  const { outerRef, innerRef, style: scaleStyle, outerStyle } = useCanvasScale();

  // Recomputed on every keystroke — one O(n) pass over ≤100 blocks.
  const sections = useMemo(() => toSections(contentBlocks), [contentBlocks]);
  const screens = useMemo(() => groupSectionsByHeading(sections), [sections]);

  // Flat index per block id, so gutter controls act on the real array position.
  const indexById = useMemo(() => {
    const m = new Map();
    contentBlocks.forEach((b, i) => m.set(b.id, i));
    return m;
  }, [contentBlocks]);

  // Context handed to the paragraph AI: the lesson, the heading it sits under,
  // and the body text before it — so a generated paragraph continues the lesson
  // rather than restating it.
  const aiContextFor = useCallback((blockId) => {
    const idx = sections.findIndex((sec) => sec.id === blockId);
    if (idx < 0) return { lessonName, headingText: '', precedingText: '' };

    let headingText = '';
    const before = [];
    for (let i = 0; i < idx; i++) {
      const sec = sections[i];
      if (sec.content_type === 'heading') {
        // A new H2 resets the section context.
        if ((sec.content?.level || 2) === 2) { headingText = sec.content?.text || ''; before.length = 0; }
        continue;
      }
      if (sec.content_type === 'paragraph') {
        const t = typeof sec.content === 'string' ? sec.content : sec.content?.text || '';
        if (t.trim()) before.push(t.trim());
      }
    }
    return {
      lessonName,
      headingText,
      // Last few paragraphs only — enough to continue from without flooding it.
      precedingText: before.slice(-3).join('\n\n'),
    };
  }, [sections, lessonName]);

  const blockById = useMemo(() => {
    const m = new Map();
    contentBlocks.forEach((b) => m.set(b.id, b));
    return m;
  }, [contentBlocks]);

  /**
   * Where a block inserted "below this one" actually lands.
   *
   * Naively that is `flatIndex + 1`, but media attaches to the screen it follows.
   * Inserting a quiz straight after a paragraph that owns an image would push the
   * image onto the quiz's screen and leave the paragraph unillustrated. Stepping
   * over trailing media keeps the screen it belongs to intact.
   */
  const insertIndexAfter = useCallback((flatIndex) => {
    let i = flatIndex + 1;
    while (i < contentBlocks.length && isMediaType(contentBlocks[i].type)) i++;
    return i;
  }, [contentBlocks]);

  if (contentBlocks.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-center"
        style={{ minHeight: 320, border: '1px dashed #E0E0E0', borderRadius: 8, background: '#FCFCFC' }}
      >
        <div>
          <p className="text-base font-light text-black" style={{ letterSpacing: '-0.01em' }}>
            This lesson has no content yet.
          </p>
          <p className="text-sm text-gray-500" style={{ marginTop: 6 }}>
            Add a heading or paragraph from the toolbar above to get started.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div ref={outerRef} style={outerStyle}>
    <div
      ref={innerRef}
      className="ignite-lesson-surface"
      style={{
        ...scaleStyle,
        border: '1px solid #E6E6E6',
        borderRadius: 8,
        overflow: 'hidden',
        // Paint the right column's grey continuously behind the whole grid so
        // full-width dividers don't stripe it.
        background: 'linear-gradient(to right, #FFFFFF 0 60%, #F0F0F0 60% 100%)',
      }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 3fr) minmax(0, 2fr)' }}>
        {/* Lesson header — mirrors the player's fixed header (eyebrow + h1).
            Inside the grid, confined to column 1: in the player this header
            lives in the left flex-[3] column, so spanning the full canvas
            width would let a long title run under the media column. */}
        <div style={{ gridColumn: 1, padding: '30px 70px 0 40px', minWidth: 0 }}>
          <p style={{ color: '#EF0B72', fontSize: '1rem', letterSpacing: '-0.01em', margin: 0 }}>
            Lesson {lessonNumber}
          </p>
          <h1 style={{ fontSize: '1.7rem', fontWeight: 600, lineHeight: 1.2, letterSpacing: '-0.01em', margin: '2px 0 0 0', overflowWrap: 'break-word' }}>
            {lessonName || 'Untitled lesson'}
          </h1>
        </div>
        {/* Empty cell keeps the header's grid row aligned */}
        <div style={{ gridColumn: 2 }} />
        {screens.map((screen, screenIdx) => {
          const resolved = selectGroupMedia(screens, screenIdx);

          const warnings = [];
          if (resolved.dropped.length > 0) {
            warnings.push(
              `${resolved.dropped.length + 1} media — only the first shows`
            );
          }
          const hasBody = screen.some(
            (s) =>
              s.content_type === 'paragraph' ||
              s.content_type === 'scored_question' ||
              s.content_type === 'box_match'
          );
          if (!hasBody) warnings.push('No body text on this screen');

          return (
            <React.Fragment key={screen[0]?.id ?? screenIdx}>
              {/* Screen marker at the TOP of each screen, spanning both
                  columns, so the count and any warnings are read before the
                  content they describe. */}
              {/* No padding — the rule runs edge to edge across the canvas.
                  ScreenBreak insets its own pill to line up with the text. */}
              <div style={{ gridColumn: '1 / -1' }}>
                <ScreenBreak
                  index={screenIdx}
                  total={screens.length}
                  warnings={warnings}
                  isFirst={screenIdx === 0}
                />
              </div>

              {/* Text column. A flex column so the suggested-question chip can
                  be pushed to the bottom of the row — grid rows size to the
                  taller cell, so when the media column is taller the chip would
                  otherwise float mid-row instead of sitting on the divider. */}
              <div
                style={{
                  gridColumn: 1,
                  padding: '20px 70px 20px 40px',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div>
                {/* Headings carried forward from an earlier screen. The player
                    pins these above the content, so they are still on screen
                    here even though they were authored elsewhere. */}
                <InheritedHeadings {...selectGroupHeadings(screens, screenIdx)} />

                {/* Insert above the very first block — the only position the
                    per-block "insert below" control below cannot reach. */}
                {onInsertAt && screenIdx === 0 && (
                  <InsertPoint
                    onInsert={(type) => onInsertAt(type, 0)}
                    label="Insert a block at the start of the lesson"
                  />
                )}

                {/* Media is edited in the grey column where students see it,
                    so the text column carries text blocks only. */}
                {screen.filter((s) => !isMediaType(s.content_type)).map((section) => {
                  const block = blockById.get(section.id);
                  if (!block) return null;
                  const flatIndex = indexById.get(block.id);
                  return (
                    <React.Fragment key={block.id}>
                      <CanvasBlock
                        block={block}
                        section={section}
                        index={flatIndex}
                        isFirst={flatIndex === 0}
                        isLast={flatIndex === contentBlocks.length - 1}
                        onMoveUp={() => onMoveUp(flatIndex)}
                        onMoveDown={() => onMoveDown(flatIndex)}
                        onRemove={() => onRemove(block.id)}
                        onUpdateContent={(content) => onUpdateContent(block.id, content)}
                        onUpdateBlock={(patch) => onUpdateBlock(block.id, patch)}
                        onGenerateUser={() => onGenerateUser(block.id, flatIndex)}
                        isGeneratingUser={generatingQuestionForId === block.id}
                        aiContext={aiContextFor(block.id)}
                      />
                      {onInsertAt && (
                        <InsertPoint
                          onInsert={(type) => onInsertAt(type, insertIndexAfter(flatIndex))}
                          label="Insert a block below this one"
                        />
                      )}
                    </React.Fragment>
                  );
                })}
                </div>

                {/* Suggested-question chip, pinned to the bottom of the screen
                    so it sits directly above the divider — mirroring the player,
                    where it appears beside the chat input at the foot of the
                    screen. Screens that inherit it show it too. */}
                {(() => {
                  const sq = selectGroupSuggestedQuestion(screens, screenIdx);
                  // The marker lives on the screen's first block.
                  const anchorId = screen[0]?.id;
                  const anchorEnds = !!blockById.get(anchorId)?.endsSuggestedQuestion;

                  // This screen is where the author ended the chip.
                  if (anchorEnds) {
                    return (
                      <div style={{ marginTop: 'auto', paddingTop: 20 }}>
                        <SuggestedQuestionStop
                          onUndo={() => onUpdateBlock(anchorId, { endsSuggestedQuestion: false })}
                        />
                      </div>
                    );
                  }

                  // Downstream of a stop, or before any heading — nothing to show.
                  if (!sq.source) return null;

                  if (sq.inherited) {
                    if (!sq.question) return null;
                    return (
                      <div style={{ marginTop: 'auto', paddingTop: 20 }}>
                        <div style={{ opacity: 0.5 }}>
                          <div
                            className="text-left text-sm text-black px-4 py-2.5 rounded-lg"
                            style={{
                              backgroundColor: '#F0F0F0', letterSpacing: '-0.01em',
                              fontWeight: 300, maxWidth: 420,
                            }}
                          >
                            {sq.question}
                          </div>
                        </div>
                        <div className="flex items-center gap-3" style={{ marginTop: 4 }}>
                          <span className="text-xs" style={{ color: '#8200EA' }}>
                            inherited from screen {sq.fromGroupIndex + 1} — edit it there
                          </span>
                          <button
                            onClick={() => onUpdateBlock(anchorId, { endsSuggestedQuestion: true })}
                            className="text-xs text-gray-400 hover:text-gray-800 transition"
                            title="Stop showing this chip from this screen onward"
                          >
                            end here
                          </button>
                        </div>
                      </div>
                    );
                  }

                  const ownerId = sq.source.id;
                  const ownerIndex = indexById.get(ownerId);
                  return (
                    <div style={{ marginTop: 'auto', paddingTop: 20 }}>
                      <SuggestedQuestionEditor
                        value={blockById.get(ownerId)?.suggestedQuestion}
                        onChange={(v) => onUpdateBlock(ownerId, { suggestedQuestion: v })}
                        onGenerate={() => onGenerateSuggested(ownerId, ownerIndex)}
                        generating={generatingQuestionForId === ownerId}
                      />
                    </div>
                  );
                })()}
              </div>

              {/* Media column — rendered and edited here, resolved by the same
                  rules the player uses. */}
              <div style={{ gridColumn: 2, padding: 32 }}>
                <MediaRail
                  ownMedia={screen.filter((s) => isMediaType(s.content_type))}
                  resolved={resolved}
                  indexById={indexById}
                  blockCount={contentBlocks.length}
                  // The marker lives on the screen's first block, so it travels
                  // with that content if the lesson is reordered.
                  endsHere={!!blockById.get(screen[0]?.id)?.endsMedia}
                  onEndMedia={() => onUpdateBlock(screen[0]?.id, { endsMedia: true })}
                  onResumeMedia={() => onUpdateBlock(screen[0]?.id, { endsMedia: false })}
                  onMoveUp={onMoveUp}
                  onMoveDown={onMoveDown}
                  onRemove={onRemove}
                  renderSettings={(mediaSection) => (
                    <MediaSettings
                      section={mediaSection}
                      onChange={(content) => onUpdateContent(mediaSection.id, content)}
                      onUploadImage={(file) => onUploadImage(file, mediaSection.id)}
                      svgPrompt={svgPrompts[mediaSection.id]}
                      onSvgPromptChange={(v) => onSvgPromptChange(mediaSection.id, v)}
                      onUseSectionContent={() => onUseSectionContent(mediaSection.id, indexById.get(mediaSection.id))}
                      onGenerateSvg={() => onGenerateSvg(mediaSection.id, indexById.get(mediaSection.id))}
                      generatingSvg={generatingSvgId === mediaSection.id}
                    />
                  )}
                />
              </div>

            </React.Fragment>
          );
        })}
      </div>
    </div>
    </div>
  );
};

export default LessonCanvas;
