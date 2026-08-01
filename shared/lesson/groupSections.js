/**
 * Lesson pagination — how a flat block list becomes the screens a student steps
 * through with the Continue button.
 *
 * Extracted from `LearningHubV2.jsx` so the admin canvas draws its screen-break
 * dividers from the exact same logic the player uses. If these ever diverge,
 * the editor starts lying about where lessons split.
 */
import { MEDIA_TYPES } from './blockTypes.js';

/**
 * Group sections into screens.
 *
 * - A heading always starts a new screen.
 * - Each paragraph or scored_question gets its OWN screen.
 * - Media, lists and bulletlists attach to the current screen.
 *
 * @param {Array} sections - flat, ordered section rows
 * @returns {Array<Array>} one inner array per student screen
 */
export const groupSectionsByHeading = (sections) => {
  const groups = [];
  let currentGroup = [];
  let hasContentInGroup = false; // seen a paragraph/scored_question in this group?

  (sections || []).forEach((section) => {
    const level = section.content?.level || 2;
    const isHeading = section.content_type === 'heading' && (level === 2 || level === 3);
    const isParagraph = section.content_type === 'paragraph';
    const isScoredQuestion = section.content_type === 'scored_question';

    if (isHeading) {
      if (currentGroup.length > 0) {
        groups.push(currentGroup);
        currentGroup = [];
        hasContentInGroup = false;
      }
      currentGroup.push(section);
    } else if (isParagraph || isScoredQuestion) {
      if (hasContentInGroup) {
        groups.push(currentGroup);
        currentGroup = [];
        hasContentInGroup = false;
      }
      currentGroup.push(section);
      hasContentInGroup = true;
    } else {
      currentGroup.push(section);
    }
  });

  if (currentGroup.length > 0) groups.push(currentGroup);

  return groups;
};

/**
 * Resolve which single media item a screen displays.
 *
 * Only ONE media item is ever shown. If the group has its own media, the first
 * one wins and any others are silently dropped — the admin canvas surfaces that
 * as a warning. If the group has none, walk backwards for the most recent
 * `content.persist` media, stopping at the first group that had any
 * non-persistent media (which "consumed" the slot).
 *
 * @returns {{ section: object|null, inherited: boolean, fromGroupIndex: number|null, dropped: Array }}
 */
/**
 * Does this screen explicitly end carried-forward media?
 *
 * Stored inside the block's existing `content` JSONB, so no migration. Read
 * from either shape — `content.endsMedia` for rows straight from the database,
 * or the flattened `ends_media` that `blockAdapter.toSection` emits.
 */
export const groupEndsMedia = (group) =>
  (group || []).some((s) => s?.content?.endsMedia === true || s?.ends_media === true);

const NO_MEDIA = {
  section: null,
  inherited: false,
  fromGroupIndex: null,
  dropped: [],
  endedAtGroupIndex: null,
};

export const selectGroupMedia = (allGroups, groupIndex) => {
  const group = allGroups[groupIndex] || [];
  const own = group.filter((s) => MEDIA_TYPES.includes(s.content_type));

  // A screen's own media always wins, marker or not.
  if (own.length > 0) {
    return {
      section: own[0],
      inherited: false,
      fromGroupIndex: groupIndex,
      dropped: own.slice(1), // authored but never rendered
      endedAtGroupIndex: null,
    };
  }

  // Explicitly ended on this screen.
  if (groupEndsMedia(group)) {
    return { ...NO_MEDIA, endedAtGroupIndex: groupIndex };
  }

  for (let i = groupIndex - 1; i >= 0; i--) {
    const prev = allGroups[i] || [];

    // Ended on an earlier screen — nothing carries past it.
    if (groupEndsMedia(prev)) {
      return { ...NO_MEDIA, endedAtGroupIndex: i };
    }

    const persistent = prev.filter(
      (s) => MEDIA_TYPES.includes(s.content_type) && s.content?.persist
    );
    if (persistent.length > 0) {
      return {
        section: persistent[persistent.length - 1],
        inherited: true,
        fromGroupIndex: i,
        dropped: [],
        endedAtGroupIndex: null,
      };
    }
    // A group with non-persistent media ends the look-back.
    if (prev.some((s) => MEDIA_TYPES.includes(s.content_type))) break;
  }

  return { ...NO_MEDIA };
};

const isH2 = (s) => s.content_type === 'heading' && (s.content?.level || 2) === 2;

/**
 * Does this screen explicitly end the inherited suggested-question chip?
 *
 * Stored inside the block's existing `content` JSONB rather than a new column,
 * so it needs no migration. Read from either shape: `content.endsSuggestedQuestion`
 * (rows straight from the database, as the player sees them) or the flattened
 * `ends_suggested_question` that `blockAdapter.toSection` emits for the editor.
 */
export const groupEndsSuggestedQuestion = (group) =>
  (group || []).some(
    (s) => s?.content?.endsSuggestedQuestion === true || s?.ends_suggested_question === true
  );

/**
 * Resolve the suggested-question chip for a screen.
 *
 * The chip belongs to an H2 and carries onto the screens beneath it. It stops
 * at whichever comes first walking backwards:
 *   - an H2, which owns the chip and starts a fresh one; or
 *   - a screen explicitly marked as ending it, which yields no chip from that
 *     screen onward until the next H2.
 *
 * @returns {{ question: string|null, source: object|null, inherited: boolean,
 *             fromGroupIndex: number|null, endedAtGroupIndex: number|null }}
 */
export const selectGroupSuggestedQuestion = (allGroups, groupIndex) => {
  for (let i = groupIndex; i >= 0; i--) {
    const group = allGroups[i] || [];

    // An H2 owns the chip, so it wins over a stop marker on the same screen.
    const owner = group.find(isH2);
    if (owner) {
      return {
        question: owner.suggested_question?.trim() || null,
        source: owner,
        inherited: i !== groupIndex,
        fromGroupIndex: i,
        endedAtGroupIndex: null,
      };
    }

    if (groupEndsSuggestedQuestion(group)) {
      return {
        question: null,
        source: null,
        inherited: false,
        fromGroupIndex: null,
        endedAtGroupIndex: i,
      };
    }
  }

  return {
    question: null,
    source: null,
    inherited: false,
    fromGroupIndex: null,
    endedAtGroupIndex: null,
  };
};

const isH3 = (s) => s.content_type === 'heading' && s.content?.level === 3;

/**
 * Resolve the headings pinned above a screen.
 *
 * Headings don't scroll away — the player renders the active H2 (and H3) as
 * fixed section headers above the content, so a heading authored on screen 3
 * is still on screen for screens 4, 5, 6… An H3 is scoped to its H2: crossing
 * an H2 boundary clears it.
 *
 * Mirrors LearningHubV2's `persistentH2` / `persistentH3` memos.
 *
 * @returns {{
 *   h2: object|null, h2Inherited: boolean, h2FromGroupIndex: number|null,
 *   h3: object|null, h3Inherited: boolean, h3FromGroupIndex: number|null
 * }}
 */
export const selectGroupHeadings = (allGroups, groupIndex) => {
  const group = allGroups[groupIndex] || [];
  const ownH2 = group.find(isH2) || null;
  const ownH3 = group.find(isH3) || null;

  let h2 = ownH2;
  let h2FromGroupIndex = ownH2 ? groupIndex : null;
  if (!h2) {
    outer: for (let i = groupIndex - 1; i >= 0; i--) {
      const g = allGroups[i] || [];
      for (let j = g.length - 1; j >= 0; j--) {
        if (isH2(g[j])) {
          h2 = g[j];
          h2FromGroupIndex = i;
          break outer;
        }
      }
    }
  }

  // A screen that opens a new H2 without its own H3 clears any inherited H3.
  let h3 = null;
  let h3FromGroupIndex = null;
  if (ownH3) {
    h3 = ownH3;
    h3FromGroupIndex = groupIndex;
  } else if (!ownH2) {
    outer3: for (let i = groupIndex - 1; i >= 0; i--) {
      const g = allGroups[i] || [];
      for (let j = g.length - 1; j >= 0; j--) {
        if (isH3(g[j])) {
          h3 = g[j];
          h3FromGroupIndex = i;
          break outer3;
        }
        // H3s are scoped to their H2 — stop at the boundary.
        if (isH2(g[j])) break outer3;
      }
    }
  }

  return {
    h2,
    h2Inherited: !!h2 && h2FromGroupIndex !== groupIndex,
    h2FromGroupIndex,
    h3,
    h3Inherited: !!h3 && h3FromGroupIndex !== groupIndex,
    h3FromGroupIndex,
  };
};

/**
 * Player-shaped wrapper: the array form `MediaPanel` expects.
 */
export const selectGroupMediaSections = (allGroups, groupIndex) => {
  const { section } = selectGroupMedia(allGroups, groupIndex);
  return section ? [section] : [];
};
