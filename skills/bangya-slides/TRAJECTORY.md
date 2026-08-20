# Trajectory: Abaka Robotics Open Day deck

The collaboration record behind the `bangya-slides` skill — reconstructed from the raw
session transcripts (4 sessions, Aug 19 2026, ~10 hours wall clock) of
`~/Downloads/Playground/aba_robotics_openday`. Times are local (PDT).

## The sessions

| Session | Role | Span | Scale |
|---|---|---|---|
| A (`d605b501`) | Main: content → build → revisions | 04:56 – 14:52 | 227 user / 425 assistant turns, 38 MB |
| B (`b0564d83`) | Standalone visual-style agent | 06:30 – 07:33 | styleboard + template |
| C (`33139b33`) | Standalone asset-download agent | 06:32 – 07:00 | 24 videos + image-gen + crops |
| D (`e83b8e11`) | Retrospective (this skill) | next day | — |

Sessions B and C ran **in parallel with A**, deliberately: "some agents is doing the
content polishment and i want u as a stand alone agent."

## Session A — the main line

### Phase 1: content settlement (04:56 – 05:50)
- Bangya briefed: in-company expert talk on robotics for a mixed tech/non-tech audience,
  HTML slides, relaxed tone, "avoid fancy phrasing, do not make it sound like an advertisement."
  Visual style explicitly out of scope ("I will set up the overall visual styles with another agent").
- Claude launched **5 background research subagents** over the course of the phase
  (π0.5 deep-read of blog + paper, OpenETA, π0.7/MEM/RECAP, old-era methods, startups/rivals)
  while asking questions in the foreground.
- **Q&A rounds as markdown**: Claude wrote `questions_round1.md` (15 questions, each with a
  recommended answer and an empty `Answer:` line); Bangya answered in place in the IDE and said
  just "answered" / "done". Three rounds total, each round computed from the previous round's
  answers plus fresh research. `citations.md` maintained throughout (each paper + why it's needed).
- Output: `experttalk_v2.md` — the full fine-grained talk in plain English with `[ASSET: ...]`
  placeholders and `TODO-RESEARCH` slots that the still-running agents later patched.

### Phase 2: wireframes + asset sweep (05:50 – 06:45)
- Bangya skipped a planned markdown slide-outline step: "your experttalk_v2.md is already very
  detailed, so we can directly work on the slides' HTML drafts."
- **3 parallel asset-collection subagents** (history/old-era, data-methods/market, π0.5/papers)
  downloaded ~25 verified images (existence + >5KB + valid image checks; one agent extracted the
  ACT figure from the arXiv source tarball at 400dpi), and reported URL-only items into
  `assets.md` — the human-download handoff file.
- Wireframes: scratchy per-slide layout HTML — content blocks, green dashed media-placeholder
  boxes with descriptions, yellow animation-idea bars. Restructured on feedback into
  `slides/` with one file per section + `common.css/js` + `build_all.sh` → `all.html`
  (view-as-a-whole requirement), later archived to `slides_layout/`.
- Course corrections from Bangya, mid-phase: kill product-launch phrasing ("Ten names worth
  knowing"), don't overload pages, multiple slides per bullet is fine, extend the journey into
  the embodiment (chunk → PD control → motion) with a playable 3D model proposed as placeholder.

### Phase 3: the big build (07:20 – 08:25)
- Trigger: "now implemented with the design `_claude_tmp/knotwork_template.html`" (Session B's
  output). Requirements arrived as one dense message: slider not scroll, fullscreen button,
  citations in small footers, self-render-and-check every slide, de-AI phrasing at the end,
  placeholders for anything too complicated (leave for subagents).
- Built: `slides/00_open.html … 04_abaka.html` fragments + `deck.css` + `deck.js` +
  `build_deck.sh` → `deck.html` (43 slides). `progress.md` created as the tracker: overall
  checklist + per-slide table (id / ground / title / status / PH markers).
- **Render-check loop**: headless-Chrome screenshot of every slide into `_claude_tmp/renders/`,
  visual inspection in batches, fix list (HUD overlapped footers, clipped ticker, clipped SVG
  labels…), re-render to verify. Two full passes.

### Phases 4–6: revision rounds (08:49 – 14:52)
- **Round 2** ("one idea per page"): narrative section 11 → 23 slides; hover-reveal interactions
  everywhere; "don't be so budget on the slides."
- **Round 3** ("add more details for the taxonomy"): 9 detail slides, one per taxonomy entry,
  each with real media; deck at 63 slides.
- **Round 4 + 5: `feedback.md`**. Bangya switched channels: wrote 30+ numbered items in
  `feedback.md`, said "check my feedback.md". Claude implemented every item, tracked each in
  `progress.md`, dispatched an asset-fetch subagent for the media items, and re-rendered
  modified slides. A second feedback pass followed the same shape. Late items came as short
  chat messages keyed to slide IDs ("J20 red teaming research put some robotics videos not the crews").
- Notable moves inside the rounds: porting a 7-DOF Franka Panda three.js viewer **natively into
  a slide** (after "you should learn to add the 3d model into the html, by reading that html"),
  video-wall click-to-zoom lightbox with sound, wiring Abaka's 6 real product demos when Bangya
  dropped them into `assets/abaka_products/`.
- End state: 61 slides, every feedback item addressed, leftovers logged in `progress.md`
  under "Placeholders left for later" with owners (user / subagent / project owners).

## Session B — the style negotiation (parallel)

- Prompt: design the overall visual style as a standalone agent; six candidates.
- Claude read the project for context, pulled the brand orange from the logo, loaded design
  skills, and built a **styleboard**: 6 candidate directions, each rendered as two real 16:9
  mini-slides (title + the same content slide) so candidates compare fairly. Published as an artifact.
- Convergence: "A and F look fine, but F is too bold the font" → 3 alternate typefaces rendered
  side by side → **Knotwork with Outfit 600** chosen.
- Then the **comprehensive template**: full token system, type scale, three grounds
  (paper / brand orange / cinema black), every slide archetype the talk needed, and a reusable
  watermark component iterated over 3 rounds of feedback (bottom layer, robotic glyphs, 9 icon
  types, jittered scatter, diagonal drift, gradient half-page fades, hidden control bar with
  density/opacity/speed sliders). Decision saved to memory; template at
  `_claude_tmp/knotwork_template.html` — the exact file Session A implemented from.
- Ended with a debug request ("random strings at the bottom") that turned out to be a non-bug,
  verified by tag-balance check + fetching the served HTML + headless render.

## Session C — the asset mule (parallel)

- Prompt: "plz help download each missing assets, mainly videos here, then update the assets.md."
- 15 direct mp4s via a curl script + 9 YouTube clips via yt-dlp, both as background jobs;
  7 YouTube 403s retried successfully with the android player client; **every file verified
  playable with ffprobe**, resolutions noted back into `assets.md`.
- "list what i can do for you on my side" → Claude produced the human-only task list
  (screenshot an X thread behind login, optional HD re-grabs).
- Image generation: Bangya provided a PPAPI endpoint + gpt-image-2; Claude generated the one
  missing photo (ego-rig data collection) and visually inspected it.
- Bangya dropped `assets/manual/danfeixu_all.png` (8503px-tall thread screenshot); Claude
  sliced it, found crop boundaries visually, cropped 8 clean per-tweet images, fixed 4
  imperfect edges after inspection.

## What made it work

1. **Markdown files as the coordination bus** — questions, citations, assets, progress,
   feedback each got a dedicated file; chat stayed terse ("done", "continue", "check feedback.md").
2. **Research and asset subagents in the background** while the foreground conversation kept moving.
3. **Style negotiated in a parallel session** against real rendered mini-slides, then handed
   over as a template file — content work never blocked on it.
4. **Placeholders as first-class citizens** — nothing blocked the build; every gap became a
   labeled placeholder with an owner, tracked in `progress.md`.
5. **Self-verification discipline** — headless renders of every slide, inspected and re-rendered
   after fixes; downloaded media verified by file checks / ffprobe / visual inspection.
6. **Clear division of labor** — Claude did everything scriptable; Bangya did logins,
   screenshots, API keys, brand assets, and judgment calls.
7. **De-AI phrasing passes** on request — no ad-speak, no triads, no dash-heavy slogans.
