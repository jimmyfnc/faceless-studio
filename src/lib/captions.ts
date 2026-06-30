/**
 * Caption types. This shape matches word-level output from Whisper
 * (whisper.cpp / @remotion/install-whisper-cpp), which is the backbone
 * of the "your voice drives the timeline" workflow:
 *
 *   vo.wav  ->  whisper  ->  CaptionWord[]  ->  synced captions + scene timing
 */
export type CaptionWord = {
  text: string;
  /** Start time in milliseconds, relative to the start of the voiceover. */
  startMs: number;
  /** End time in milliseconds, relative to the start of the voiceover. */
  endMs: number;
};

export type CaptionsJson = {
  words: CaptionWord[];
};

export type CaptionBlock = {
  words: CaptionWord[];
  startMs: number;
  endMs: number;
};

/**
 * Group caption words into readable phrase blocks. A block holds still on screen
 * while its words are spoken (instead of the text sliding word-by-word), which is
 * much easier to follow. Breaks at sentence-ending punctuation, or after
 * `maxWords` words — whichever comes first.
 */
export function chunkCaptions(words: CaptionWord[], maxWords = 6): CaptionBlock[] {
  const blocks: CaptionBlock[] = [];
  let cur: CaptionWord[] = [];
  const flush = () => {
    if (cur.length) {
      blocks.push({ words: cur, startMs: cur[0].startMs, endMs: cur[cur.length - 1].endMs });
      cur = [];
    }
  };
  for (const w of words) {
    cur.push(w);
    if (cur.length >= maxWords || /[.!?]$/.test(w.text)) flush();
  }
  flush();
  return blocks;
}
