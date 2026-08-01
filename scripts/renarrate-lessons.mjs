/**
 * Re-narrate lessons in the current narration voice.
 *
 * Lessons keep whatever voice they were generated in until the audio is rebuilt,
 * so a voice change is a two-step rollout: deploy the new NARRATION_VOICE_ID,
 * then run this. `lesson_audio.voice_id` records what each lesson actually
 * holds, so the worklist is exact and the run is resumable — re-running only
 * picks up what is still outstanding.
 *
 * ElevenLabs bills per character and quotas are monthly, so --dry-run reports
 * the spend before anything is generated and --limit lets a large catalogue be
 * worked through across several billing periods.
 *
 *   node scripts/renarrate-lessons.mjs --dry-run
 *   node scripts/renarrate-lessons.mjs --limit 5
 *   node scripts/renarrate-lessons.mjs --course product-manager
 *   node scripts/renarrate-lessons.mjs --all          # include up-to-date lessons
 *
 * Requires VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (enumeration) and a
 * reachable API (generation).
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const value = (name, fallback = null) => {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};

const DRY_RUN = flag('dry-run');
const INCLUDE_CURRENT = flag('all');
const COURSE = value('course');
const LIMIT = value('limit') ? parseInt(value('limit'), 10) : null;
const DELAY_MS = parseInt(value('delay', '2000'), 10);
const MAX_ATTEMPTS = 3;

// The voice the run is targeting. Read from the same env var server.js uses so
// the two cannot disagree; the fallback must stay in step with server.js.
const TARGET_VOICE_ID = process.env.ELEVENLABS_NARRATION_VOICE_ID || 'G7ILShrCNLfmS0A37SXS';

// Deliberately NOT defaulting to VITE_API_URL: that is set to localhost in the
// repo's .env, so inheriting it would silently point a production backfill at a
// dev server (or fail outright) while still reading the production database.
const API_URL = value('api', process.env.RENARRATE_API_URL || 'https://ignite-education-api.onrender.com');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const n = (x) => x.toLocaleString();

// Mirrors extractLessonText in server.js so --dry-run can price the run without
// asking the API. If the two drift the estimate drifts with them, which is why
// the real character_count is preferred wherever a row already exists.
const extractLessonText = (lessonName, sections) => {
  const parts = [lessonName];
  for (const section of sections) {
    if (section.content_type === 'heading' && section.content?.text) {
      parts.push(section.content.text);
    } else if (section.content_type === 'paragraph' && section.content?.text) {
      let text = section.content.text;
      text = text.replace(/\*\*(.*?)\*\*/g, '$1');
      text = text.replace(/\*(.*?)\*/g, '$1');
      text = text.replace(/\[(.*?)\]\(.*?\)/g, '$1');
      text = text.replace(/^[•–—]\s*/gm, '');
      text = text.replace(/\n-\s+/g, '\n');
      parts.push(text);
    } else if (section.content_type === 'list' && section.content?.items) {
      parts.push(section.content.items.join('. '));
    }
  }
  return parts.join('. ').replace(/\s+/g, ' ').trim();
};

const main = async () => {
  console.log('\nRe-narrate lessons');
  console.log('  target voice :', TARGET_VOICE_ID);
  console.log('  api          :', API_URL);
  console.log('  mode         :', DRY_RUN ? 'DRY RUN (nothing will be generated)' : 'LIVE — this spends ElevenLabs characters');
  if (COURSE) console.log('  course filter:', COURSE);
  console.log();

  // 1. Every distinct lesson that has content.
  let query = supabase
    .from('lessons')
    .select('course_id, module_number, lesson_number, content_type, content, lesson_name')
    .order('course_id')
    .order('module_number')
    .order('lesson_number')
    .order('section_number');
  if (COURSE) query = query.eq('course_id', COURSE);

  const { data: blocks, error } = await query;
  if (error) {
    console.error('Failed to read lessons:', error.message);
    process.exit(1);
  }

  const lessons = new Map();
  for (const b of blocks) {
    const key = `${b.course_id}|${b.module_number}|${b.lesson_number}`;
    if (!lessons.has(key)) {
      lessons.set(key, {
        courseId: b.course_id,
        moduleNumber: b.module_number,
        lessonNumber: b.lesson_number,
        lessonName: b.lesson_name || '',
        sections: [],
      });
    }
    lessons.get(key).sections.push(b);
  }

  // 2. What voice each already-narrated lesson holds.
  const { data: audio } = await supabase
    .from('lesson_audio')
    .select('course_id, module_number, lesson_number, voice_id, character_count');
  const audioByKey = new Map(
    (audio || []).map((a) => [`${a.course_id}|${a.module_number}|${a.lesson_number}`, a])
  );

  // 3. Work out what actually needs doing.
  const worklist = [];
  let alreadyCurrent = 0;
  for (const [key, lesson] of lessons) {
    const existing = audioByKey.get(key);
    if (!INCLUDE_CURRENT && existing?.voice_id === TARGET_VOICE_ID) {
      alreadyCurrent++;
      continue;
    }
    const chars =
      existing?.character_count ||
      extractLessonText(lesson.lessonName, lesson.sections).length;
    worklist.push({ ...lesson, chars, currentVoice: existing?.voice_id || null, hasAudio: !!existing });
  }

  worklist.sort((a, b) =>
    a.courseId.localeCompare(b.courseId) || a.moduleNumber - b.moduleNumber || a.lessonNumber - b.lessonNumber
  );

  const selected = LIMIT ? worklist.slice(0, LIMIT) : worklist;
  const totalChars = selected.reduce((s, l) => s + l.chars, 0);
  const allChars = worklist.reduce((s, l) => s + l.chars, 0);

  console.log(`lessons found            : ${lessons.size}`);
  console.log(`already on target voice  : ${alreadyCurrent}`);
  console.log(`needing re-narration     : ${worklist.length}  (${n(allChars)} characters)`);
  if (LIMIT) console.log(`this run (--limit ${LIMIT})      : ${selected.length}  (${n(totalChars)} characters)`);
  console.log();

  if (selected.length === 0) {
    console.log('Nothing to do.');
    return;
  }

  console.log('  #   course / lesson                       chars    current voice');
  selected.forEach((l, i) => {
    console.log(
      `  ${String(i + 1).padStart(3)} ${`${l.courseId} M${l.moduleNumber}L${l.lessonNumber}`.padEnd(36)} ${String(l.chars).padStart(7)}    ${l.currentVoice || '(none)'}`
    );
  });
  console.log();

  if (DRY_RUN) {
    console.log(`DRY RUN — would spend ${n(totalChars)} ElevenLabs characters across ${selected.length} lessons.`);
    console.log('Re-run without --dry-run to generate. Use --limit to stay inside a monthly quota.');
    return;
  }

  // 4. Generate, one lesson at a time.
  let ok = 0;
  let failed = 0;
  const failures = [];

  for (const [i, lesson] of selected.entries()) {
    const label = `${lesson.courseId} M${lesson.moduleNumber}L${lesson.lessonNumber}`;
    process.stdout.write(`[${i + 1}/${selected.length}] ${label} (${n(lesson.chars)} chars) ... `);

    let done = false;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS && !done; attempt++) {
      try {
        const res = await fetch(`${API_URL}/api/admin/generate-lesson-audio`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courseId: lesson.courseId,
            moduleNumber: lesson.moduleNumber,
            lessonNumber: lesson.lessonNumber,
            // Always forced: the content hash now covers the voice, but an
            // interrupted run must be able to redo a lesson whose row was
            // written before its upload finished.
            forceRegenerate: true,
            voiceId: TARGET_VOICE_ID,
          }),
        });

        const body = await res.text();
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`);

        let json;
        try {
          json = JSON.parse(body);
        } catch {
          // The SPA catch-all rewrite returns HTML for a mistyped API host,
          // which would otherwise look like a success.
          throw new Error(`expected JSON, got ${body.slice(0, 80)}`);
        }

        if (json.skipped) {
          console.log('skipped (already up to date)');
        } else {
          console.log(`ok — ${json.lessonAudio?.duration_seconds?.toFixed(1) ?? '?'}s`);
        }
        ok++;
        done = true;

        // An API that predates the voice change ignores the voiceId in the body
        // and narrates in whatever it has hardcoded, reporting success either
        // way. Check what actually landed before spending the rest of the quota.
        if (ok === 1 && !json.skipped) {
          const { data: check } = await supabase
            .from('lesson_audio')
            .select('voice_id')
            .eq('course_id', lesson.courseId)
            .eq('module_number', lesson.moduleNumber)
            .eq('lesson_number', lesson.lessonNumber)
            .single();
          if (check && check.voice_id !== TARGET_VOICE_ID) {
            console.error(
              `\nABORTING: the API generated voice ${check.voice_id}, not ${TARGET_VOICE_ID}.` +
              `\nDeploy the current server.js to ${API_URL} before running this — the rest of the` +
              `\nrun would spend the whole quota on the wrong voice.`
            );
            process.exit(1);
          }
        }
      } catch (e) {
        if (attempt === MAX_ATTEMPTS) {
          console.log(`FAILED — ${e.message}`);
          failed++;
          failures.push({ label, error: e.message });
        } else {
          process.stdout.write(`retry ${attempt}/${MAX_ATTEMPTS - 1} ... `);
          await sleep(DELAY_MS * attempt * 2);
        }
      }
    }

    if (i < selected.length - 1) await sleep(DELAY_MS);
  }

  console.log(`\nDone. ${ok} succeeded, ${failed} failed.`);
  if (failures.length) {
    console.log('\nFailures (re-run the script to retry just these):');
    failures.forEach((f) => console.log(`  ${f.label}: ${f.error}`));
    process.exitCode = 1;
  }
  if (!LIMIT || worklist.length <= selected.length) return;
  console.log(`\n${worklist.length - selected.length} lessons still outstanding — re-run when quota allows.`);
};

main().catch((e) => {
  console.error('\nUnexpected failure:', e);
  process.exit(1);
});
