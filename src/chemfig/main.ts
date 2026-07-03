import './styles.css';
import { buildLewisChemfig, chemfigLewisToSvg } from './chemfig';

const app = document.getElementById('app');
if (!app) throw new Error('No #app element');

app.innerHTML = `
  <div class="container">
    <h1>Chemfig demo</h1>
    <div class="controls">
      <div style="display:flex;flex-direction:column;gap:8px;flex:0 0 300px;">
        <label for="exampleSelect"><strong>Examples</strong></label>
        <select id="exampleSelect">
          <option value="h2oVisual">H2O — visual (142.25°)</option>
          <option value="h2oHalf">H2O — half-angle (104.5°)</option>
          <option value="buildO">O (build Lewis)</option>
        </select>
      </div>

      <textarea id="input" rows="4"></textarea>
    </div>
    <div id="output" class="output"></div>
  </div>
`;

const input = document.getElementById('input') as HTMLTextAreaElement;
const output = document.getElementById('output') as HTMLDivElement;
const exampleSelect = document.getElementById('exampleSelect') as HTMLSelectElement;
// examples list: easily expandable — use correct chemfig formulas
const examples: { id: string; title: string; formula: string }[] = [
  // Atoms
  {
    id: "he",
    title: "He",
    formula: String.raw`\chemfig{\charge{90=\|}{He}}`,
  },
  {
    id: "na-plus",
    title: "Na+",
    formula: String.raw`\chemfig{Na}^{+}`,
  },
  {
    id: "hydroxide",
    title: "OH⁻",
    formula: String.raw`\chemfig{\charge{90=\|,180=\|,270=\|}{O}-[:0]H}^{-}`,
  },
  {
    id: "ammonium",
    title: "NH₄⁺",
    formula: String.raw`\chemfig{N(-[:90]H)(-[:180]H)(-[:270]H)-[:0]H}^{+}`,
  },
  {
    id: "be",
    title: "Be",
    formula: String.raw`\chemfig{\charge{90=\.,0=\.}{Be}}`,
  },
  {
    id: "c",
    title: "C",
    formula: String.raw`\chemfig{\charge{90=\.,0=\.,270=\.,180=\.}{C}}`,
  },
  {
    id: "n",
    title: "N",
    formula: String.raw`\chemfig{\charge{90=\|,0=\.,270=\.,180=\.}{N}}`,
  },

  // Diatomic molecules
  {
    id: "h2",
    title: "H₂",
    formula: String.raw`\chemfig{H-H}`,
  },
  {
    id: "hcl",
    title: "HCl",
    formula: String.raw`\chemfig{H-\charge{90=\|,0=\|,270=\|}{Cl}}`,
  },
  {
    id: "hf",
    title: "HF",
    formula: String.raw`\chemfig{H-\charge{90=\|,0=\|,270=\|}{F}}`,
  },
  {
    id: "f2",
    title: "F₂",
    formula: String.raw`\chemfig{\charge{90=\|,180=\|,270=\|}{F}-\charge{90=\|,0=\|,270=\|}{F}}`,
  },
  {
    id: "cl2",
    title: "Cl₂",
    formula: String.raw`\chemfig{\charge{90=\|,180=\|,270=\|}{Cl}-\charge{90=\|,0=\|,270=\|}{Cl}}`,
  },
  {
    id: "o2",
    title: "O₂",
    formula: String.raw`\chemfig{\charge{90=\|,270=\|}{O}=\charge{90=\|,270=\|}{O}}`,
  },
  {
    id: "n2",
    title: "N₂",
    formula: String.raw`\chemfig{\charge{180=\|}{N}~\charge{0=\|}{N}}`,
  },

  // Simple hydrides
  {
    id: "h2o",
    title: "H₂O",
    formula: String.raw`\chemfig{H-[:142]\charge{90=\|,270=\|}{O}-[:-142]H}`,
  },
  {
    id: "nh3",
    title: "NH₃",
    formula: String.raw`\chemfig{\charge{90=\|}{N}(-[:210]H)(-[:-30]H)-[:90]H}`,
  },
  {
    id: "ch4",
    title: "CH₄",
    formula: String.raw`\chemfig{C(-[:90]H)(-[:180]H)(-[:270]H)-[:0]H}`,
  },

  // Oxygen compounds
  {
    id: "co2",
    title: "CO₂",
    formula: String.raw`\chemfig{\charge{90=\|,270=\|}{O}=C=\charge{90=\|,270=\|}{O}}`,
  },
  {
    id: "h2o2",
    title: "H₂O₂",
    formula: String.raw`\chemfig{H-\charge{90=\|,270=\|}{O}-[:0]\charge{90=\|,270=\|}{O}-[:0]H}`,
  },
  {
    id: "of2",
    title: "OF₂",
    formula: String.raw`\chemfig{\charge{180=\|,270=\|,90=\|}{F}-[:25]\charge{90=\|,270=\|}{O}-[:-25]\charge{0=\|,90=\|,270=\|}{F}}`,
  },

  // Carbon chains
  {
    id: "c2h6",
    title: "C₂H₆",
    formula: String.raw`\chemfig{C(-[:90]H)(-[:180]H)(-[:270]H)-[:0]C(-[:90]H)(-[:-90]H)-[:0]H}`,
  },
  {
    id: "c2h4",
    title: "C₂H₄",
    formula: String.raw`\chemfig{C(-[:120]H)(-[:240]H)=[:0]C(-[:60]H)-[:-60]H}`,
  },
  {
    id: "c2h2",
    title: "C₂H₂",
    formula: String.raw`\chemfig{H-C~C-H}`,
  },

  // Small organic molecules
  {
    id: "ch3oh",
    title: "CH₃OH",
    formula: String.raw`\chemfig{C(-[:90]H)(-[:180]H)(-[:270]H)-[:0]\charge{90=\|,270=\|}{O}-[:0]H}`,
  },
  {
    id: "ch3f",
    title: "CH₃F",
    formula: String.raw`\chemfig{C(-[:90]H)(-[:180]H)(-[:270]H)-[:0]\charge{90=\|,0=\|,270=\|}{F}}`,
  },
  {
    id: "ch2o",
    title: "CH₂O",
    formula: String.raw`\chemfig{C(-[:120]H)(-[:240]H)=[:0]\charge{90=\|,270=\|}{O}}`,
  },
  {
    id: "hcooh",
    title: "HCOOH",
    formula: String.raw`\chemfig{H-C(=[:90]\charge{90=\|,0=\|}{O})-[:0]\charge{90=\|,270=\|}{O}-[:0]H}`,
  },
  {
    id: "ch3cho",
    title: "CH₃CHO",
    formula: String.raw`\chemfig{C(-[:90]H)(-[:180]H)(-[:270]H)-[:0]C(=[:90]\charge{90=\|,0=\|}{O})-[:0]H}`,
  },

  // Nitrogen compounds
  {
    id: "hcn",
    title: "HCN",
    formula: String.raw`\chemfig{H-C~\charge{0=\|}{N}}`,
  },
  {
    id: "n2h4",
    title: "N₂H₄",
    formula: String.raw`\chemfig{\charge{90=\|}{N}(-[:120]H)(-[:240]H)-[:0]\charge{90=\|}{N}(-[:60]H)-[:-60]H}`,
  },
  {
    id: "nh2oh",
    title: "NH₂OH",
    formula: String.raw`\chemfig{\charge{90=\|}{N}(-[:120]H)(-[:240]H)-[:0]\charge{90=\|,270=\|}{O}-[:0]H}`,
  },
  {
    id: "nf3",
    title: "NF₃",
    formula: String.raw`\chemfig{\charge{90=\|}{N}(-[:210]\charge{90=\|,180=\|,270=\|}{F})(-[:-30]\charge{90=\|,0=\|,270=\|}{F})-[:90]\charge{180=\|,90=\|,0=\|}{F}}`,
  },

  // Boron / carbon halides
  {
    id: "bf3",
    title: "BF₃",
    formula: String.raw`\chemfig{B(-[:210]\charge{90=\|,180=\|,270=\|}{F})(-[:-30]\charge{90=\|,0=\|,270=\|}{F})-[:90]\charge{180=\|,90=\|,0=\|}{F}}`,
  },
  {
    id: "cf4",
    title: "CF₄",
    formula: String.raw`\chemfig{C(-[:90]\charge{180=\|,90=\|,0=\|}{F})(-[:180]\charge{90=\|,180=\|,270=\|}{F})(-[:270]\charge{180=\|,270=\|,0=\|}{F})-[:0]\charge{90=\|,0=\|,270=\|}{F}}`,
  },
  {
    id: "ccl4",
    title: "CCl₄",
    formula: String.raw`\chemfig{C(-[:90]\charge{180=\|,90=\|,0=\|}{Cl})(-[:180]\charge{90=\|,180=\|,270=\|}{Cl})(-[:270]\charge{180=\|,270=\|,0=\|}{Cl})-[:0]\charge{90=\|,0=\|,270=\|}{Cl}}`,
  },

  // More small school-level molecules
  {
    id: "h2s",
    title: "H₂S",
    formula: String.raw`\chemfig{H-[:142]\charge{90=\|,270=\|}{S}-[:-142]H}`,
  },
  {
    id: "cs2",
    title: "CS₂",
    formula: String.raw`\chemfig{\charge{90=\|,270=\|}{S}=C=\charge{90=\|,270=\|}{S}}`,
  },
];
// populate select
exampleSelect.innerHTML = examples.map(e => `<option value="${e.id}">${e.title}</option>`).join('');

function renderChem() {
  const v = input.value.trim();
  try {
    const svg = chemfigLewisToSvg(v);
    output.innerHTML = svg;
  } catch (e: any) {
    output.innerHTML = `<pre class="error">${e?.message || String(e)}</pre>`;
  }
}

// set selected example into textarea and render
function applyExampleById(id: string) {
  const ex = examples.find(x => x.id === id);
  if (!ex) return;
  input.value = ex.formula;
  renderChem();
}

// auto-apply when selection changes
exampleSelect.addEventListener('change', () => applyExampleById(exampleSelect.value));

// auto-render as user types (debounced)
let renderTimer: number | undefined;
input.addEventListener('input', () => {
  if (renderTimer) clearTimeout(renderTimer);
  renderTimer = window.setTimeout(() => renderChem(), 180);
});

// initial
applyExampleById('h2o');
