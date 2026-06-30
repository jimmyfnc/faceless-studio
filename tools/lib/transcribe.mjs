/**
 * Transcribe a voiceover into word-level captions with Whisper.cpp.
 *
 * Library-first: the CLI (`tools/transcribe.mjs`) and the future web app both
 * call `transcribeToWords()`. Output is the engine's `CaptionWord[]` shape
 * (`{ text, startMs, endMs }`), ready to drop into a video's `captions`.
 *
 * Whisper.cpp needs a 16-bit/16kHz mono WAV, so we resample first using
 * Remotion's bundled ffmpeg (`npx remotion ffmpeg`) — no system ffmpeg required.
 */
import path from "node:path";
import { tmpdir } from "node:os";
import {
  installWhisperCpp,
  downloadWhisperModel,
  transcribe as whisperTranscribe,
  toCaptions,
} from "@remotion/install-whisper-cpp";
import { runRemotion } from "../_run.mjs";

const WHISPER_VERSION = "1.5.5";
/** whisper.cpp + models install here (gitignored). */
export const WHISPER_DIR = path.join(process.cwd(), "whisper.cpp");

/** Resample any audio file to a 16kHz mono 16-bit WAV via Remotion's bundled ffmpeg. */
export function resampleTo16kWav(inputPath) {
  const base = path.basename(inputPath).replace(/\.[^.]+$/, "");
  const outPath = path.join(tmpdir(), `faceless-whisper-${base}-16k.wav`);
  const res = runRemotion(["ffmpeg", "-i", inputPath, "-ar", "16000", "-ac", "1", outPath, "-y"]);
  if (res.status !== 0) {
    throw new Error(`ffmpeg resample failed (exit ${res.status}) for ${inputPath}`);
  }
  return outPath;
}

/** Ensure whisper.cpp + the model are installed. Idempotent and cached. */
export async function ensureWhisper(model) {
  await installWhisperCpp({ to: WHISPER_DIR, version: WHISPER_VERSION });
  await downloadWhisperModel({ model, folder: WHISPER_DIR });
}

/**
 * Transcribe an audio file to word-level captions.
 * @returns {Promise<Array<{text: string, startMs: number, endMs: number}>>}
 */
export async function transcribeToWords({ inputPath, model = "medium.en", onProgress } = {}) {
  if (!inputPath) throw new Error("transcribeToWords: inputPath is required");

  await ensureWhisper(model);
  const wavPath = resampleTo16kWav(inputPath);

  const whisperCppOutput = await whisperTranscribe({
    inputPath: wavPath,
    whisperPath: WHISPER_DIR,
    whisperCppVersion: WHISPER_VERSION,
    model,
    tokenLevelTimestamps: true, // --dtw: accurate word timings
    printOutput: false,
    onProgress,
  });

  // toCaptions takes the whole transcribe result (not just .transcription).
  const { captions } = toCaptions({ whisperCppOutput });

  // Whisper emits sub-word tokens (e.g. "$", "1", ",", "000") and marks real
  // word starts with a leading space. Merge continuation tokens (and trailing
  // punctuation) into whole words so captions read naturally.
  const words = [];
  for (const c of captions) {
    const text = c.text.trim();
    const startsWord = /^\s/.test(c.text) || words.length === 0;
    if (!text) {
      if (words.length) words[words.length - 1].endMs = c.endMs;
      continue;
    }
    if (startsWord) {
      words.push({ text, startMs: c.startMs, endMs: c.endMs });
    } else {
      const prev = words[words.length - 1];
      prev.text += text;
      prev.endMs = c.endMs;
    }
  }
  return words;
}
