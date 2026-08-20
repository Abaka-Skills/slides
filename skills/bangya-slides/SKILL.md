---
name: bangya-slides
description: Bangya's pipeline for building rich HTML slide decks together — markdown Q&A rounds to settle content, a negotiated visual style, heavy multimodal assets, a click-through slider deck, then feedback.md revision rounds. Use when the user wants to create, design, or implement presentation slides, a talk deck, or mentions bangya-slides.
---

# bangya-slides

Build an HTML slide deck the way Bangya likes to work. The pipeline below was distilled
from a real ~10-hour build (Abaka Robotics Open Day, 61 slides, 4 parallel sessions);
the full record lives in [TRAJECTORY.md](TRAJECTORY.md), and
[bangya-slides-pipeline.html](bangya-slides-pipeline.html) is the one-page picture.

## Conventions (hold through every phase)

- **Markdown files are the coordination bus.** Every negotiation gets a dedicated file in the
  project root, edited in place: `questions_roundN.md`, `citations.md`, `assets.md`,
  `progress.md`, `feedback.md`. When the user replies "done" / "answered" / "check feedback.md",
  reread the file — the content is there, not in chat.
- **Division of labor.** Do everything scriptable yourself. Route to the user only what needs
  a human: logins/screenshots, API keys and paid generation, brand assets, judgment calls.
  When asked "what can I do on my side", produce that list explicitly. The user drops manual
  assets into `assets/manual/`; watch for them.
- **Placeholders are first-class.** Never block the build on a missing asset or a hard embed:
  insert a labeled placeholder, record it in `progress.md` with an owner (user / subagent /
  later), and move on.
- **Background subagents for research and asset collection** while the foreground conversation
  keeps moving. Every downloaded asset gets verified (file exists, sane size, valid
  image / ffprobe-playable, visually inspected when layout depends on it).
- **Phrasing:** relaxed and plain — this is a team sharing insights, never a product launch.
  No ad-speak, no slogan triads, no dash-heavy flourishes. Run a de-AI phrasing pass over all
  slide copy at the end of every build/revision phase.

## Pipeline

### 1. Settle content — Q&A rounds
Read the user's source materials, launch background research subagents for every external
claim (papers: read the actual paper, not the abstract), and write `questions_round1.md`:
each question with your recommended answer and an empty `Answer:` line. The user answers in
place; compute the next round from those answers plus landed research. Maintain
`citations.md` (source + why it's needed) as facts settle.
**Done when:** every question is answered, and a fine-grained talk script (`<talk>_v2.md`,
plain English, `[ASSET: ...]` placeholders) exists with no unresolved `TODO-RESEARCH` slots.

### 2. Negotiate the visual style — separate track
Style is the user's call, never inherited from a previous deck and never assumed. Run it as
its own session/agent, in parallel with phase 1–3 content work:
- Build a **styleboard**: ~6 candidate directions, each rendered as the *same* two real 16:9
  mini-slides (title + one content slide) so candidates compare fairly. Pull brand color/fonts
  from the user's real brand assets as raw material, not as the decision.
- Converge iteratively (the user will mix candidates, swap typefaces, tune weights), then
  expand the winner into a **comprehensive template file**: design tokens, type scale, grounds
  (content / brand / full-bleed media), every slide archetype the script needs, and reusable
  chrome — with the fiddly parts (watermarks, densities, speeds) exposed as live sliders in a
  hidden control bar so the user tunes instead of describes.
**Done when:** the user signs off, the template is a single self-contained HTML file, and the
chosen style is saved to memory for later sessions.

### 3. Wireframe the deck
Scratchy per-slide layout HTML, no decoration: content blocks, dashed media-placeholder boxes
with descriptions, and an animation/interaction note per slide. One file per section plus a
stitch script so the user can view the whole deck at once. Structure rules that survived
review: **one idea per page** (split rather than cram — don't be budget on slide count), and
maximize modality — video, image, 3D/WebGL, embedded sites, animated SVG.
In parallel, fan out asset-collection subagents; everything not directly fetchable goes into
`assets.md` as an annotated URL list for the user (a dedicated asset session can later burn
this down: yt-dlp with player-client fallbacks, arXiv source-tarball figure extraction,
image-gen via the user's endpoint, cropping user-supplied screenshots).
**Done when:** the user approves the wireframes and `assets.md` covers every `[ASSET]` slot.

### 4. Build the real deck
Implement on the approved template: per-section fragment HTML files + one shared CSS + one JS
slider engine + a build script that stitches `deck.html`. The deck is a **slider, not a
scroll** — click/arrow/wheel/swipe advance, fullscreen button, deep links, per-slide media
autoplay/pause. Every citation goes in a small mono footer on its slide. Create `progress.md`:
overall checklist + per-slide table (id, title, status, placeholder markers).
**Done when:** the build script runs clean and every slide from the wireframes exists.

### 5. Render-check everything
Headless-render **every slide** to screenshots and visually inspect them in batches. Collect
the fix list (overlaps, clipped text/SVGs, dead space, layouts that only fail live), apply
fixes, re-render the changed slides to verify. Then the de-AI phrasing pass, rebuild, update
`progress.md`.
**Done when:** every slide has been seen rendered and its fixes verified in a second render.

### 6. Feedback rounds — until the user stops
The user reviews the live deck and writes numbered items into `feedback.md` (or short chat
messages keyed to slide IDs). For each round: implement **every item** — structural edits
inline, media items via an asset subagent — re-render modified slides, and log each item's
resolution in `progress.md`. Items you can't finish become owned placeholders, listed under
"Placeholders left for later". Expect several rounds; late rounds get surgical.
**Done when:** the latest `feedback.md` is fully addressed and the tracker's leftover list
names an owner for everything remaining.
