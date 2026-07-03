# Chemfig demo (Vite + TypeScript)

Quick demo to exercise a partial ChemFig parser + SVG renderer (Vite + TypeScript).

Run locally:

```bash
npm install
npm run dev
```

Open http://localhost:5173 and pick an example from the dropdown or paste a `\chemfig{...}` formula into the textarea.

Integration

The renderer can be imported directly from `src/chemfig.ts` when this code is used inside another TypeScript/Vite app:

```ts
import { chemfigLewisToSvg } from "./src/chemfig";

const formula = String.raw`\chemfig{H-[:142]\charge{90=\|,270=\|}{O}-[:-142]H}`;
const svg = chemfigLewisToSvg(formula);

document.getElementById("output")!.innerHTML = svg;
```

To build a Lewis-dot ChemFig string from atom counts, use `buildLewisChemfig`:

and then render it to SVG:

```ts
import { buildLewisChemfig, chemfigLewisToSvg } from "./src/chemfig";

const formula = buildLewisChemfig({
  protonCount: 8,
  electronCount: 8,
  kShellElectronCount: 2,
  lShellElectronCount: 6,
});

const svg = chemfigLewisToSvg(formula);
```

For production, run `npm run build` and serve the generated `dist/` directory.

Supported subset
- atoms (H, C, O, N, Cl, ...)
- `\charge{angle=\.|\|,...}{X}` lone-pairs / paired electrons
- single/double/triple bonds: `-`, `=`, `~`
- bond angles: `-[:90]`, `=[:-30]`, etc.
- branches using parentheses: `C(-[:90]H)(-[:180]H)-[:0]H`

Examples you can paste or select in the demo

- He: String.raw`\chemfig{\charge{90=\|}{He}}`
- Na+: String.raw`\chemfig{Na}^{+}`
- Be: String.raw`\chemfig{\charge{90=\.,0=\.}{Be}}`
- C: String.raw`\chemfig{\charge{90=\.,0=\.,270=\.,180=\.}{C}}`
- N: String.raw`\chemfig{\charge{90=\|,0=\.,270=\.,180=\.}{N}}`
- H₂: String.raw`\chemfig{H-H}`
- HCl: String.raw`\chemfig{H-Cl}`
- H₂O: String.raw`\chemfig{H-[:142]\charge{90=\|,270=\|}{O}-[:-142]H}`
- O₂: String.raw`\chemfig{\charge{90=\|,270=\|}{O}=\charge{90=\|,270=\|}{O}}`
- N₂: String.raw`\chemfig{\charge{180=\|}{N}~\charge{0=\|}{N}}`
- CO₂: String.raw`\chemfig{\charge{90=\|,270=\|}{O}=C=\charge{90=\|,270=\|}{O}}`
- CH₄: String.raw`\chemfig{C(-[:90]H)(-[:180]H)(-[:270]H)-[:0]H}`
- NH₃: String.raw`\chemfig{\charge{90=\|}{N}(-[:210]H)(-[:-30]H)-[:90]H}`
- H₂O₂: String.raw`\chemfig{H-\charge{90=\|,270=\|}{O}-[:0]\charge{90=\|,270=\|}{O}-H}`
- CH₃OH: String.raw`\chemfig{C(-[:90]H)(-[:180]H)(-[:270]H)-[:0]\charge{90=\|,270=\|}{O}-[:0]H}`

Notes and limitations
- This is a useful educational subset, not a full ChemFig implementation. It handles linear chains, branches, bond angles, lone pairs, and bond multiplicity. It does not implement rings, macros, full TeX parsing, or advanced styling.
- If rendering needs visual tweaks (bond spacing, font size, atom radii), open `src/chemfig.ts` and adjust `bondLength`, `atomRadius`, and bond offsets in `renderBond()`.

Want me to tweak the visuals for a specific example? Tell me which molecule and what you want changed (tighter/wider bonds, larger labels).
