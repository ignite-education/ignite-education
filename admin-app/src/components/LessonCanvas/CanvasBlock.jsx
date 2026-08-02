import React, { useState } from 'react';
import { MoveUp, MoveDown, Trash2, Settings2, Sparkles } from 'lucide-react';
import ContentRenderer from '@shared/lesson/renderers/ContentRenderer';
import { BLOCK_LABELS } from '@shared/lesson/blockTypes';
import QuizCard from './QuizCard';
import MatchCard from './MatchCard';
import EditableText from './editable/EditableText';
import EditableBulletList from './editable/EditableBulletList';
import UserQuestionEditor from './editable/UserQuestionEditor';
import ParagraphAI from './editable/ParagraphAI';

/** Paragraph content is a bare string on new blocks, `{ text }` once saved. */
const paragraphText = (content) =>
  typeof content === 'string' ? content : content?.text ?? '';

const writeParagraph = (content, text) =>
  typeof content === 'object' && content !== null ? { ...content, text } : text;

/**
 * One block on the canvas.
 *
 * The invariant that keeps the canvas honest: the shared renderer is rendered
 * untouched, and every edit affordance is a SIBLING positioned in the gutters
 * outside the text measure. Nothing is injected into the renderer's output, so
 * what you see here is what `/learning` draws.
 */
const CanvasBlock = ({
  block,
  section,
  index,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onRemove,
  onUpdateContent,
  onUpdateBlock,
  onGenerateUser,
  isGeneratingUser,
  aiContext,
}) => {
  const [hovered, setHovered] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  // skipAnimation gives the complete static render with full inline-markup
  // parsing — no typewriter, no onComplete sequencing.
  const rendered = (
    <ContentRenderer section={section} sectionIdx={index} skipAnimation isActive={false} />
  );

  // Media never reaches here — LessonCanvas routes image/youtube/svg to the
  // MediaRail in the grey column, where students see them.
  let body;
  if (block.type === 'scored_question') {
    body = <QuizCard block={block} />;
  } else if (block.type === 'box_match') {
    // The student view shuffles the two columns, so unlike the other text types
    // this can't be the shared renderer — the author needs the pairs aligned.
    body = <MatchCard block={block} onUpdateContent={onUpdateContent} />;
  } else if (block.type === 'heading') {
    const level = block.content?.level === 3 ? 'h3' : 'h2';
    // The suggested-question chip is NOT rendered here. It belongs to this H2
    // but students see it at the foot of the screen next to the chat input, so
    // the canvas draws it there — see LessonCanvas/index.jsx.
    body = (
      <EditableText
        variant={level}
        value={block.content?.text ?? ''}
        placeholder={level === 'h2' ? 'Section heading' : 'Sub-heading'}
        onChange={(text) => onUpdateContent({ ...(block.content || {}), text })}
      >
        {rendered}
      </EditableText>
    );
  } else if (block.type === 'paragraph') {
    body = (
      <>
        <EditableText
          variant="paragraph"
          showToken
          value={paragraphText(block.content)}
          placeholder="Write the lesson text for this screen…"
          onChange={(text) => onUpdateContent(writeParagraph(block.content, text))}
        >
          {rendered}
        </EditableText>
        {aiOpen && (
          <ParagraphAI
            currentText={paragraphText(block.content)}
            context={aiContext}
            onAccept={(text) => onUpdateContent(writeParagraph(block.content, text))}
            onClose={() => setAiOpen(false)}
          />
        )}
        <UserQuestionEditor
          value={block.userQuestion}
          onChange={(v) => onUpdateBlock({ userQuestion: v })}
          saveFeedback={block.saveFeedback}
          onToggleSaveFeedback={(v) => onUpdateBlock({ saveFeedback: v })}
          onGenerate={onGenerateUser}
          generating={isGeneratingUser}
        />
      </>
    );
  } else if (block.type === 'bulletlist') {
    body = (
      <EditableBulletList
        items={block.content?.items || ['']}
        onChange={(items) => onUpdateContent({ ...(block.content || {}), items })}
      />
    );
  } else {
    body = rendered;
  }

  return (
    <div
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Hover outline — offset outward so it never shifts the text */}
      <div
        aria-hidden
        className="pointer-events-none absolute"
        style={{
          inset: '-6px -8px',
          borderRadius: 4,
          outline: hovered ? '1px solid #EDEDED' : '1px solid transparent',
          transition: 'outline-color 0.12s ease',
        }}
      />

      {/* Type label and controls in one floating pill at the block's top-right.
          They used to sit in the gutters at left:-34 / right:-66, which put the
          label outside the canvas border (clipped by overflow:hidden) and the
          controls on the column boundary, visually detached from their block. */}
      <div
        className="absolute flex items-center gap-0.5"
        style={{
          top: -13, right: 0, zIndex: 5,
          background: '#FFFFFF',
          border: '1px solid #E6E6E6',
          borderRadius: 6,
          padding: '1px 2px 1px 7px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          opacity: hovered || aiOpen ? 1 : 0,
          pointerEvents: hovered || aiOpen ? 'auto' : 'none',
          transition: 'opacity 0.12s ease',
        }}
      >
        <span
          className="select-none"
          style={{
            fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.03em',
            color: '#A8A8A8', marginRight: 4, whiteSpace: 'nowrap',
          }}
        >
          {BLOCK_LABELS[block.type] || block.type}
        </span>
        <button
          onClick={onMoveUp}
          disabled={isFirst}
          title="Move up"
          className="p-1 rounded hover:bg-gray-100 disabled:opacity-25 text-gray-500"
        >
          <MoveUp size={12} />
        </button>
        <button
          onClick={onMoveDown}
          disabled={isLast}
          title="Move down"
          className="p-1 rounded hover:bg-gray-100 disabled:opacity-25 text-gray-500"
        >
          <MoveDown size={12} />
        </button>
        {block.type === 'paragraph' && (
          <button
            onClick={() => setAiOpen((v) => !v)}
            title={paragraphText(block.content).trim()
              ? 'Enhance this paragraph with AI'
              : 'Write this paragraph with AI'}
            className={`p-1 rounded hover:bg-purple-50 ${aiOpen ? 'text-purple-700 bg-purple-50' : 'text-purple-500'}`}
          >
            <Sparkles size={12} />
          </button>
        )}
        <button
          title="Block settings"
          className="p-1 rounded text-gray-300 cursor-not-allowed"
          disabled
        >
          <Settings2 size={12} />
        </button>
        <button
          onClick={onRemove}
          title="Delete block"
          className="p-1 rounded hover:bg-red-50 text-gray-500 hover:text-red-600"
        >
          <Trash2 size={12} />
        </button>
      </div>

      {body}
    </div>
  );
};

export default CanvasBlock;
