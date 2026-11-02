# MohammadHossein Karimian | Portfolio

A custom, multi-page personal website for an AI researcher, machine learning engineer and developer. Rebuilt from the provided React + Vite starter project.

## Quick start (Windows 11, Git Bash or PowerShell)

Use **Node.js 22.12+** or **Node.js 26 LTS**, with npm installed.

```bash
npm install
npm run dev
```

Open the local URL shown by Vite, usually `http://localhost:5173`.

To make a production bundle:

```bash
npm run build
npm run preview
```

Deploy the `dist/` directory to Netlify, Vercel or GitHub Pages. The site uses hash routes (`#/work`, `#/about`, etc.) so refreshing a page works even without server-side URL rewrites.

## Pages

- Home: interactive expertise atlas, selected work, evidence of experience, research and capabilities
- Work: filterable projects with individual case study pages
- Experience: expandable professional timeline
- About: background, skills, education and published/accepted research
- Contact: one direct email action, address copy and LinkedIn/GitHub links

## Visual system and interaction

- Five complete color systems: Pearl (light default), Iris (dark original), Cobalt (deep blue), Apricot (warm light) and Forest (deep green). Themes change backgrounds, navigation, surfaces, cards, buttons and graphics. Choice persists in local storage when available.
- Interactive four-sided 3D expertise model with an animated quarter-turn transition. Each face shows a different specialty, an illustrated technical diagram, actual tools and a focused capability description. All four options, including AI Research, are keyboard-accessible. The model uses native CSS 3D rendering without an expensive WebGL frame loop.
- Interactive research concept explainer: switch among causality, strategy and responsibility, with explanations grounded in the portfolio research area.
- Staggered entrance reveals without blur, restrained animated technical orbits, polished project and capability-card hover treatments, transform-based scroll progress without React re-renders, animated buttons, and responsive mobile navigation.
- Reduced-motion preference support, keyboard focus indicators, skip link, semantic HTML and descriptive labels.
- No cookies, analytics trackers, remote forms, server API, or hidden data collection.
- Google Fonts is the only optional third-party asset; local system font fallbacks are provided.

## Edit your content

Update `src/data/portfolio.js` for your biography, projects, roles, skills, publications, contact information and social links.

Theme colors and responsive breakpoints: `src/index.css`.

Artwork: `src/components/ProjectArt.jsx`. Interactive expertise visualization: `src/components/ExpertiseAtlas.jsx`. Complete palette variables and baseline responsive refinements: `src/refinements.css`. New 3D, animations, research interactions and extra phone breakpoints: `src/motion-v3.css`. Responsive expertise layout, unblocked interactive controls and page-to-page door transition: `src/motion-v4.css`. Taller 3D cards and centered expertise icons: `src/motion-v5.css`. Rotation state helper: `src/components/atlasRotation.js`. Research interaction: `src/components/ResearchExplorer.jsx`.

## Source and factual notes

The website was drafted using the five LinkedIn/GitHub PDF exports supplied by the owner and publicly accessible LinkedIn profile/project descriptions. Activity and connections were deliberately not used. Research paper titles, roles and project details follow those materials. Some projects have no individual public repository link in the provided evidence; these are intentionally shown without fabricated URLs.

The single contact action opens the visitor's own email client. There is no contact form, no on-site submission and no server-side collection of personal information.

**Deployment checklist:** Confirm personal information, dates and projects before publishing, check contact email, add a proper PDF resume if desired, and replace or extend project artwork with your own screenshots if you have publication rights.

## License and dependency scope

Personal content belongs to the portfolio owner. The code uses React, React DOM and Vite. No external animation or 3D package is necessary. There are no third-party photos or stock artwork.

## Changes in version 4

- Rebuilt the expertise scene layout so the animated 3D cube and its four selection buttons are in separate vertical regions. Buttons can no longer overlap rotating cube faces or be clipped by the scene.
- Fixed an invisible click-blocking area created by the collapsed theme picker. Its visible trigger remains clickable, while its hidden content no longer intercepts taps or clicks on page content.
- Improved sizing, spacing and controls on phone, tablet and desktop widths, including a single-column selector at very narrow screen sizes.
- Removed the small "INTERACTIVE 3D" label above the model.
- Added a theme-aware, split-door page navigation transition. The doors close before the page swap, and open to reveal the new route. It supports back/forward browser navigation, a timed completion fallback and reduced-motion preferences.
- Kept the original content, all five theme palettes, case studies, research concepts and accessible expertise selection behavior intact.

## Changes in version 3

- Added a four-sided native 3D cube to the expertise selector. Clicking any specialty rotates that face into view and reveals relevant content.
- Fixed selection consistency for AI Research and added dedicated tests for all four rotations.
- Removed the unused "SELECT AN AREA" and "SELECTED WORK & EXPERIENCE" labels.
- Added subtle decorative motion, project hover sheen, capability card lift and illustrative diagrams without costly continuous 3D rendering.
- Introduced interactive research concepts with accessible selection states.
- Mobile controls adapt to a two-column grid and the 3D model scales down at 640, 390 and 320px.
- Preserved the five coordinated themes, rewritten career content and direct email contact design.

## Earlier improvements in version 2

- New light default and five fully coordinated themes. Original midnight violet is retained.
- Removed the continuous canvas render loop, heavy reveal blur filters and React state updates on scroll to improve first-scroll responsiveness.
- New accessible clickable technical expertise atlas with ML, AI research, software and web focuses.
- Rewrote vague promotional headlines and replaced creative project nicknames with technical project names.
- Expanded the Experience page to include 4 to 5 detailed contributions per role, grounded in the provided LinkedIn export.
- Removed the contact form and its subject field in favor of a single email action and quick contact links.
- Added stronger button hover, active and focus states.

## Testing notes

A Vite production build requires installing dependencies on a machine with npm registry access. Run `npm ci && npm test && npm run build`. Source tests and an isolated full React browser render were run using locally cached runtime modules. The expertise controls were exercised at 320, 390, 900 and 1440px. The door transition was observed in a browser with intermediate closing/opening states. The local npm dependency directory is incomplete, so a normal Vite production build was not completed here. Run `npm ci && npm test && npm run build` on your machine to verify the production bundle. This project intentionally excludes `node_modules` and generated `dist`.

## Changes in version 5

- Extended each rotating 3D expertise face into a responsive rectangular prism to give diagrams, descriptions and all technology tags sufficient vertical space. The scene itself grows correspondingly so the bottom of the card is not covered by the controls.
- Corrected the icon selector to keep the four expertise icons centered in their square backgrounds. The animated right-side arrow remains independent.
- Preserved page transitions, themes, copy and existing page layouts.
