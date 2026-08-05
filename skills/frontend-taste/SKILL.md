---
name: frontend-taste
description: Design/audit distinctive production UI using the complete pols.dev anti-slop law; user visual direction wins.
---

# Frontend taste

Compressed from the complete [pols.dev anti-slop design law](https://pols.dev/slop.md), retrieved 2026-08-05. Apply it before design, during implementation, and point-by-point before shipping. The user's explicit visual direction overrides every default. Do not merely dodge a checklist: make real brief-specific choices, establish one coherent world and signature first, then prove behavior and appearance in the browser.

## Reject unchosen defaults

Avoid prefab combinations and repeated house styles: pill/eyebrow badges; glowy pill CTAs; filled-primary plus outlined-secondary pairs; gradient pills with icon/text; blue-purple, candy-pastel, aurora-blob, cool blue-charcoal, cream/beige, UI-kit gray, or indiscriminately saturated palettes; gradient headline text; background/cut-off/radial glows; uniform faint grids; grain over content; all-around, duplicated-box, hard-edged, silhouette-bloom, or leaking shadows; hairline borders/rules and accent bars used as decoration; icon/logo tiles; Lucide everywhere; fake brand marks, customers, testimonials, metrics, countdowns, urgency, app/macOS/code windows, crude CSS/SVG charts, floating tags/cards, and dead controls.

Do not default to Inter, Space Grotesk, Sora, Syne, Archivo, Fraunces/Work Sans, Cormorant, Didone/Bodoni/Didot/Playfair, Sora, JetBrains/IBM Plex/Fragment Mono, the broader Google grotesque/serif/rounded novelty rotation, or a mono house voice. Swapping to a fashionable “tasteful” free font is not a decision. Signature type should fit this brief, usually licensed or self-hosted; a neutral system body is fine. Never repeat a prior site's pairing.

Avoid stock compositions: split or right-panel hero; centered/default hero stack; three-plus-line headline with dangling accent word; kicker/label over H2; big serif statement with one italic accent; numbered steps on a rail; image card with overlay caption; three-tier pricing with highlighted middle; testimonial quote card; pre-footer CTA slab; inset enquiry island and email-pill row; default SaaS sequence (hero, three feature cards, tabs, pricing, FAQ, CTA, footer); standard multi-column ruled footer; oversized footer word pasted without composition; and flat boxes on one background after an atmospheric hero. Recoloring or restacking these remains slop.

## Correctness and craft

- Content is visible by default. Never depend on entrance animation, JavaScript, hydration, observers, or scroll timelines to reveal text or controls. Motion may enhance already-visible content and must respect reduced motion.
- Every apparent control works and is tested with a real pointer. Use accessible proven primitives; in non-Tailwind projects adapt structure rather than adding global Tailwind for one block.
- Clear every cut: text and controls must survive clip paths, notches, fixed heights, overflow, section overlaps, and image seams. Zoom and inspect edges. Feather full-bleed images by masking their own pixels with long multi-stop fades, a tall section, continuous adjacent color, and any text scrim fading before edges.
- Parallel comparison columns share horizontal rows regardless of copy length: equal height, reserved variable-copy space, aligned title/price/body/list, and bottom-anchored actions. Hold empty slots.
- Give text deliberate gutters, readable contrast, breathable display tracking, and optical as well as mathematical centering, especially SVG text. Ordinary content never kisses an edge.
- Keep depth directional, tight, color-aware, and seamless. If glass bands, leaks, halos, or pops, remove it. Grain textures the substrate behind crisp content.
- Buttons do not jump/scale on hover; underlines do not wipe in; active nav does not use a decorative dot; theme toggles do not default to a sun/moon pill. Avoid ornamental eyebrow ticks and square-capped rules.
- Colors form one disciplined system, flow between sections without accidental seams, and remain legible. Hard breaks are deliberate and rare. Accents are usually tonal, not sprayed-on saturation.
- Logos/icons are either unnecessary and absent or real, honest, consistently treated marks. Use bare marks or genuinely bespoke house iconography, not redrawn generic line icons.

## Build a signature

Uniqueness requires a brief-specific point of view, not mechanical avoidance. Decide first:

1. one high-effort signature artifact that could not belong to another product;
2. an atmospheric environment rather than a flat fill;
3. foreground, midground, and background depth with purposeful overlap;
4. a real populated product artifact only when the product actually has one;
5. characterful display type;
6. one bespoke silhouette or geometry;
7. a deliberately treated nav;
8. real names, data, copy, and honestly earned social proof.

Say less; let hierarchy, spacing, and the artifact carry meaning. References provide design language, never copied content. Professional restraint still needs a heartbeat: authored hover, kinetic, parallax, scroll, or signature motion that serves the system. Calm is valid; dead is not.

## Premium techniques, only when cohesive

Choose a few that fit, never all: real refractive glass over content worth refracting; self-colored tonal edges and top-lip highlights; bespoke notches/chamfers/brackets; bare or custom icons; directional art-directed light; subtle substrate noise; crafted SVG; large whole-page composition; honest monochrome logo walls; precise textured micro-grids/ruler marks rather than graph paper; grain-dithered gradients; already-visible scroll motion; and a correctly composed oversized footer wordmark above texture, anchored or deliberately bled at the bottom without accidental clipping.

For glass, preserve the source recipe when relevant: `#2575FF` fill (50% for thick, solid thin), white Geist Medium 20 label/icon, gap 8, padding 20x14, cyan `#22BBFD` plus white 20% hairline edges, white 20% inner shadow `y=1 blur=32`, fill-colored 6% drop shadow `y=3 blur=3`; thin material angle `-45`, light `80%`, refraction `80`, depth `2`, dispersion `40`, frost `6`, splay `0`; thick `-50`, `60%`, `64`, `44`, `67`, `2`, `20`. CSS approximates frost with backdrop blur/saturation/contrast, top inset highlight, layered low-opacity edges, tight color shadow, and optional 1px chromatic edge or SVG displacement. Never use it over a flat backdrop.

Useful foundations include Motion (`motion/react`) for authored animation; shadcn/Radix for accessible primitives; Tailark for blocks; motion-primitives and Kokonut for animated components. Tailwind-based sources must be adapted to the existing stack when Tailwind is absent. Prebuilt behavior is only a foundation: remove its generic styling and rerun this audit.

## Final visual audit

Inspect the full first viewport as one intentional frame; no accidental next-section fragment. Test every viewport, state, interactive control, alignment row, contrast boundary, clip, overlap, image seam, shadow, animation fallback, and reduced-motion path. Compare the whole page against every rejected tell and composition above, then ask the deeper questions: Did this design invent anything? Could its artifact, type, layout, palette, and motion belong unchanged to another product or a previous build? If yes, redesign before calling it done.
