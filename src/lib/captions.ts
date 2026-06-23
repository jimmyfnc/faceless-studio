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
