# faceless-studio — AI session guide

Code-driven **faceless explainer videos** with Remotion. The creator's recorded
voice drives the timeline; charts/diagrams/b-roll sync to the narration. Full
production pipeline and commands live in [WORKFLOW.md](WORKFLOW.md).

**Current version: 0.6.0** (pre-launch; bumps to `1.0.0` when the channel ships
its first real video).

## What this project is

- **Niche:** explainer / educational (leans on Remotion's data-accurate animated charts).
- **Voice:** the creator's *own recorded* narration for the final cut (not AI TTS).
- **Mode:** hybrid — auto-draft a video, then polish in **Remotion Studio**.
- **Stack:** Remotion 4 + React 19 + TypeScript (Tailwind v4 available). ComfyUI for visuals.
- **MCPs** (`.mcp.json`, project-scoped): `remotion` (docs) and `elevenlabs` (scratch
  TTS / SFX / Scribe STT — needs `ELEVENLABS_API_KEY` in the environment).

## Key commands

```bash
npm run dev                                   # Studio on the engine sample
npm run studio -- <channel> <slug>            # Studio on a channel video (merges brand+props)
npm run render -- <channel> <slug>            # render → out/<channel>-<slug>.mp4
npm run transcribe -- <channel> <slug>        # vo.* → captions.json (Whisper, word-level)
npm run draft -- <channel> <slug>             # script.md + captions.json → props.json (voice-aligned)
npm run assets -- <channel> <slug> "query"    # license-safe media (Openverse/own) → credits.json
node tools/comfyui-generate.mjs --workflow workflows/x.json --out public/assets/<channel>/<slug> --prompt "..."
npm test                                      # vitest: schema/fixture, brand merge, caption merge
./scripts/install-hooks.sh                    # run once per clone to install the pre-commit hook
```

## Engine vs brand vs content (important)

Three layers; only the first bumps the version:

- **Engine — `src/`** (compositions, scenes, schema, `defaultBrand`). Changes here
  are product changes and **must bump the version** (the hook enforces it).
- **Brand — `channels/<id>/brand.json`** (colors + fonts, validates against
  `brandSchema`). Re-skinning a channel is content, **not** a version bump.
- **Content — `channels/<id>/videos/<slug>/`** (`script.md`, `props.json`,
  `captions.json`) + `public/assets/<id>/<slug>/` media. Making a video is **not**
  a version bump.

Making or re-skinning a video must never touch `src/`. The render/studio wrappers
merge `brand.json` into `props.json` (which validates against `explainerSchema`).
`src/data/sample-explainer.ts` is the engine's no-content demo, not a video. Only
`channels/example-explainers/` is tracked; real channels are git-ignored.

## Versioning conventions

- Semver `x.y.z`, pre-launch `0.x`. **Feature → minor** (`0.1.0` → `0.2.0`),
  **fix/polish → patch** (`0.1.0` → `0.1.1`). One user-visible change per version;
  never batch fixes for "later".
- Every release ships with its CHANGELOG entry **and** an annotated git tag.

## Release checklist (when shipping an engine change)

1. Bump `version` in `package.json` (patch=fix, minor=feature).
2. Add a `## [x.y.z] — YYYY-MM-DD` entry to `CHANGELOG.md` (user-facing wording).
3. Update the "Current version" line above if you reference it.
4. If a roadmap item shipped: remove its `docs/ROADMAP.md` row and
   `git mv` its brainstorm to `docs/archive/`.
5. Commit (the pre-commit hook verifies 1–2).
6. Tag and push:
   ```bash
   git tag -a vX.Y.Z -m "vX.Y.Z — one-line summary"
   git push origin main --follow-tags
   ```

## Docs workflow

- `docs/ROADMAP.md` — active ideas ranked by effort (🟢🟡🔴⚫).
- `docs/brainstorms/` — live idea write-ups. Adding/removing one requires a
  ROADMAP update (hook-enforced).
- `docs/archive/` — shipped docs. **Never delete docs; archive them.**

## Don't

- Don't use `git commit --no-verify` except for docs-only or emergency commits — and say so.
- Don't commit recorded/generated media (`*.wav/*.mp3/*.mp4` under `public/assets/` are gitignored).
