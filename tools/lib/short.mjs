/**
 * Trim a video's sections to a leading window of `seconds` (the teaser/hook for
 * a vertical short). Whole sections are kept while they fit; the boundary
 * section is truncated to land exactly on the target. If the whole video is
 * shorter than the target, it's returned unchanged. Pure + tested.
 */
export function trimSectionsToSeconds(sections, seconds, fps) {
  const target = Math.max(1, Math.round(seconds * fps));
  const out = [];
  let total = 0;
  for (const s of sections) {
    if (total >= target) break;
    const remaining = target - total;
    const dur = Math.min(s.durationInFrames, remaining);
    out.push(dur === s.durationInFrames ? s : { ...s, durationInFrames: dur });
    total += dur;
  }
  return out;
}

/** Total frames of a section list. */
export function totalFrames(sections) {
  return sections.reduce((sum, s) => sum + s.durationInFrames, 0);
}
