type ChargeItem = {
  angle: number;
  kind: "." | "|";
};

type ParsedAtom = {
  atom: string;
  chargeItems: ChargeItem[];
  ionCharge?: string;
};

type BondOrder = 1 | 2 | 3;

type ParsedBond = {
  angle?: number;
  order: BondOrder;
};

type MoleculeNode = {
  atom: ParsedAtom;
  children: {
    bond: ParsedBond;
    node: MoleculeNode;
  }[];
};

type ParsedChemfig = {
  root: MoleculeNode;
};

type ChemfigSvgOptions = {
  width?: number;
  height?: number;
  padding?: number;
};

function parseChargeSpec(chargeSpec: string): ChargeItem[] {
  return chargeSpec
    .split(",")
    .map(s => s.trim())
    .filter(Boolean)
    .map(part => {
      const [angleRaw, symbolRaw] = part.split("=");
      const angle = Number(angleRaw);

      if (!Number.isFinite(angle)) {
        throw new Error(`Invalid charge angle: ${angleRaw}`);
      }

      let kind: "." | "|";

      if (symbolRaw.includes("\\.")) kind = ".";
      else if (symbolRaw.includes("\\|")) kind = "|";
      else throw new Error(`Unsupported charge symbol: ${symbolRaw}`);

      return { angle, kind };
    });
}

function parseAtomAt(src: string, index: number): { atom: ParsedAtom; next: number } {
  const rest = src.slice(index);

  // \charge{90=\|,270=\|}{O}
  const chargeMatch = rest.match(/^\\charge\{([^}]*)\}\{([A-Za-z][a-z]?)\}/);
  if (chargeMatch) {
    return {
      atom: {
        atom: chargeMatch[2],
        chargeItems: parseChargeSpec(chargeMatch[1]),
      },
      next: index + chargeMatch[0].length,
    };
  }

  // Plain atom, e.g. H, O, Cl
  const atomMatch = rest.match(/^([A-Za-z][a-z]?)/);
  if (atomMatch) {
    return {
      atom: {
        atom: atomMatch[1],
        chargeItems: [],
      },
      next: index + atomMatch[0].length,
    };
  }

  throw new Error(`Expected atom at: ${rest}`);
}

function parseBondAt(src: string, index: number): { bond: ParsedBond; next: number } {
  const rest = src.slice(index);

  // Matches -[:142], =[:0], ~[:0]
  const angledBond = rest.match(/^([-~=])\[:(-?\d+(?:\.\d+)?)\]/);
  if (angledBond) {
    return {
      bond: {
        order: bondSymbolToOrder(angledBond[1]),
        angle: Number(angledBond[2]),
      },
      next: index + angledBond[0].length,
    };
  }

  // Matches plain -, =, ~
  const plainBond = rest.match(/^[-~=]/);
  if (plainBond) {
    return {
      bond: {
        order: bondSymbolToOrder(plainBond[0]),
      },
      next: index + 1,
    };
  }

  throw new Error(`Expected bond at: ${rest}`);
}

function bondSymbolToOrder(symbol: string): BondOrder {
  if (symbol === "-") return 1;
  if (symbol === "=") return 2;
  if (symbol === "~") return 3;

  throw new Error(`Unsupported bond symbol: ${symbol}`);
}

function parseChemfig(input: string): ParsedChemfig {
  const prefix = "\\chemfig{";
  if (!input.startsWith(prefix)) {
    throw new Error("Unsupported chemfig syntax: expected \\chemfig{...}");
  }

  let depth = 1;
  let end = prefix.length;
  while (end < input.length && depth > 0) {
    const char = input[end];
    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    end += 1;
  }

  if (depth !== 0) {
    throw new Error("Unsupported chemfig syntax: unbalanced braces");
  }

  const src = input.slice(prefix.length, end - 1).trim();
  const trailing = input.slice(end).trim();
  const trailingCharge = trailing.match(/^\^\{?([+-]?\d*[+-]?)\}?$/);
  if (trailing && !trailingCharge) {
    throw new Error(`Unexpected trailing chemfig input: ${trailing}`);
  }
  const ionCharge = trailingCharge?.[1];

  // We'll parse into a MoleculeNode structure and then convert to a flat legacy ParsedChemfig
  type MoleculeNode = {
    atom: ParsedAtom;
    children: {
      bond: ParsedBond;
      node: MoleculeNode;
    }[];
  };

  let i = 0;

  function skipSpace() {
    while (src[i] === " " || src[i] === "\n" || src[i] === "\t") i++;
  }

  function parseNode(): MoleculeNode {
    skipSpace();

    const atomResult = parseAtomAt(src, i);
    i = atomResult.next;

    const node: MoleculeNode = {
      atom: atomResult.atom,
      children: [],
    };

    while (i < src.length) {
      skipSpace();

      if (src[i] === ")") {
        break;
      }

      // Branch: (...)
      if (src[i] === "(") {
        i++; // consume "("
        skipSpace();

        const bondResult = parseBondAt(src, i);
        i = bondResult.next;

        const child = parseNode();

        skipSpace();

        if (src[i] !== ")") {
          throw new Error(`Expected ")" at: ${src.slice(i)}`);
        }

        i++; // consume ")"

        node.children.push({ bond: bondResult.bond, node: child });

        continue;
      }

      // Main-chain continuation: -Atom, =Atom, ~Atom
      if (src[i] === "-" || src[i] === "=" || src[i] === "~") {
        const bondResult = parseBondAt(src, i);
        i = bondResult.next;

        const child = parseNode();

        node.children.push({ bond: bondResult.bond, node: child });

        continue;
      }

      break;
    }

    return node;
  }

  const rootNode = parseNode();
  skipSpace();

  if (i !== src.length) {
    throw new Error(`Unexpected trailing chemfig input: ${src.slice(i)}`);
  }

  if (ionCharge) {
    rootNode.atom.ionCharge = ionCharge;
  }

  return { root: rootNode };
}


function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;

  return {
    x: cx + r * Math.cos(rad),
    y: cy - r * Math.sin(rad),
  };
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderBond(
  parts: string[],
  a: { x: number; y: number },
  b: { x: number; y: number },
  order: BondOrder,
  atomRadius: number
) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.sqrt(dx * dx + dy * dy);

  if (len === 0) return;

  const ux = dx / len;
  const uy = dy / len;

  const px = -uy;
  const py = ux;

  const start = {
    x: a.x + ux * atomRadius,
    y: a.y + uy * atomRadius,
  };

  const end = {
    x: b.x - ux * atomRadius,
    y: b.y - uy * atomRadius,
  };

  const offsets =
    order === 1
      ? [0]
      : order === 2
        ? [-3.5, 3.5]
        : [-5, 0, 5];

  for (const offset of offsets) {
    parts.push(`
      <line
        x1="${start.x + px * offset}"
        y1="${start.y + py * offset}"
        x2="${end.x + px * offset}"
        y2="${end.y + py * offset}"
        stroke="currentColor"
        stroke-width="3"
        stroke-linecap="round"
      />
    `);
  }
}

function renderChargeItems(parts: string[], atom: ParsedAtom, cx: number, cy: number) {
  const electronRadius = 32;

  for (const item of atom.chargeItems) {
    if (item.kind === ".") {
      const p = polar(cx, cy, electronRadius, item.angle);

      parts.push(
        `<circle cx="${p.x}" cy="${p.y}" r="3.2" fill="currentColor" />`
      );
    }

    if (item.kind === "|") {
      const pairRadius = electronRadius * 0.9;
      const p = polar(cx, cy, pairRadius, item.angle);

      const length = 15;
      const tangentAngle = ((item.angle + 90) * Math.PI) / 180;

      const dx = Math.cos(tangentAngle) * (length / 2);
      const dy = -Math.sin(tangentAngle) * (length / 2);

      const x1 = p.x - dx;
      const y1 = p.y - dy;
      const x2 = p.x + dx;
      const y2 = p.y + dy;

      parts.push(`
        <line
          x1="${x1}"
          y1="${y1}"
          x2="${x2}"
          y2="${y2}"
          stroke="currentColor"
          stroke-width="3"
          stroke-linecap="round"
        />
      `);
    }
  }
}

export function chemfigLewisToSvg(input: string, options: ChemfigSvgOptions = {}): string {
  const parsed = parseChemfig(input);

  const bondLength = 72;
  const atomRadius = 18;
  const padding = options.padding ?? 40;

  type PositionedNode = {
    node: MoleculeNode;
    x: number;
    y: number;
    children: {
      bond: ParsedBond;
      child: PositionedNode;
    }[];
  };

  function layoutMolecule(root: MoleculeNode, bondLength: number): PositionedNode {
    function walk(node: MoleculeNode, x: number, y: number, incomingAngle: number | null): PositionedNode {
      const positioned: PositionedNode = { node, x, y, children: [] };

      for (const child of node.children) {
        const angle = child.bond.angle ?? incomingAngle ?? 0;
        const p = polar(x, y, bondLength, angle);

        positioned.children.push({ bond: child.bond, child: walk(child.node, p.x, p.y, angle) });
      }

      return positioned;
    }

    return walk(root, 0, 0, null);
  }

  function flattenPositioned(root: PositionedNode): PositionedNode[] {
    const out: PositionedNode[] = [];

    function walk(n: PositionedNode) {
      out.push(n);
      for (const c of n.children) walk(c.child);
    }

    walk(root);
    return out;
  }

  function renderBondsRecursive(parts: string[], positioned: PositionedNode, shiftX: number, shiftY: number, atomR: number) {
    const a = { x: positioned.x + shiftX, y: positioned.y + shiftY };

    for (const child of positioned.children) {
      const b = { x: child.child.x + shiftX, y: child.child.y + shiftY };
      renderBond(parts, a, b, child.bond.order, atomR);
      renderBondsRecursive(parts, child.child, shiftX, shiftY, atomR);
    }
  }

  function renderAtomsRecursive(parts: string[], positioned: PositionedNode, shiftX: number, shiftY: number) {
    const atom = positioned.node.atom;

    const x = positioned.x + shiftX;
    const y = positioned.y + shiftY;

    renderChargeItems(parts, atom, x, y);

    parts.push(`
      <text x="${x}" y="${y}"
        text-anchor="middle"
        dominant-baseline="central"
        font-family="serif"
        font-size="34" fill="currentColor">${escapeXml(atom.atom)}</text>
    `);

    if (atom.ionCharge) {
      parts.push(`
        <text x="${x + 34}" y="${y - 38}"
          text-anchor="middle"
          font-family="serif"
          font-size="32" font-weight="800" fill="currentColor">${escapeXml(atom.ionCharge)}</text>
      `);
    }

    for (const child of positioned.children) {
      renderAtomsRecursive(parts, child.child, shiftX, shiftY);
    }
  }

  const layout = layoutMolecule(parsed.root, bondLength);
  const nodes = flattenPositioned(layout);

  const minX = Math.min(...nodes.map(p => p.x)) - padding;
  const maxX = Math.max(...nodes.map(p => p.x)) + padding;
  const minY = Math.min(...nodes.map(p => p.y)) - padding;
  const maxY = Math.max(...nodes.map(p => p.y)) + padding;

  const width = maxX - minX;
  const height = maxY - minY;
  const svgWidth = options.width ?? width;
  const svgHeight = options.height ?? height;

  const shiftX = -minX;
  const shiftY = -minY;

  const parts: string[] = [];

  parts.push(`
  <svg xmlns="http://www.w3.org/2000/svg"
      width="${svgWidth}"
      height="${svgHeight}"
      viewBox="0 0 ${width} ${height}"
      preserveAspectRatio="xMidYMid meet">
  `);

  renderBondsRecursive(parts, layout, shiftX, shiftY, atomRadius);
  renderAtomsRecursive(parts, layout, shiftX, shiftY);

  parts.push(`</svg>`);

  return parts.join("\n");
}

const ELEMENTS = [
  { symbol: "H", name: "Hydrogen" },
  { symbol: "He", name: "Helium" },
  { symbol: "Li", name: "Lithium" },
  { symbol: "Be", name: "Beryllium" },
  { symbol: "B", name: "Boron" },
  { symbol: "C", name: "Carbon" },
  { symbol: "N", name: "Nitrogen" },
  { symbol: "O", name: "Oxygen" },
  { symbol: "F", name: "Fluorine" },
  { symbol: "Ne", name: "Neon" },
];

export function getLewisData(input: {
  protonCount: number;
  electronCount: number;
  kShellElectronCount: number;
  lShellElectronCount: number;
}) {
  const { protonCount, electronCount, kShellElectronCount, lShellElectronCount } = input;
  const element = ELEMENTS[protonCount - 1] || { symbol: "?", name: "Unknown" };

  if (protonCount <= 0 || element.symbol === "?") return null;

  const valenceElectrons =
    protonCount <= 2
      ? Math.min(2, kShellElectronCount)
      : Math.min(8, lShellElectronCount);

  const angles = [90, 0, 270, 180];
  const occupancy = [0, 0, 0, 0];

  if (protonCount <= 2) {
    occupancy[0] = valenceElectrons;
  } else {
    for (let i = 0; i < valenceElectrons; i++) {
      occupancy[i % 4] += 1;
    }
  }

  const chargeSpec = angles
    .map((angle, i) => {
      if (occupancy[i] >= 2) return `${angle}=\\|`;
      if (occupancy[i] === 1) return `${angle}=\\.`;
      return "";
    })
    .filter(Boolean)
    .join(",");

  const charge = protonCount - electronCount;
  const formatCharge = (c: number) => {
    if (c === 0) return "";
    const sign = c > 0 ? "+" : "-";
    const abs = Math.abs(c);
    return `^{${abs === 1 ? `${sign}` : `${abs}${sign}`}}`;
  };

  const ionCharge = formatCharge(charge);

  return {
    element,
    valenceElectrons,
    occupancy,
    charge,
    ionCharge,
    chargeSpec,
  };
}

export function buildLewisChemfig(input: {
  protonCount: number;
  electronCount: number;
  kShellElectronCount: number;
  lShellElectronCount: number;
}): string {
  const data = getLewisData(input);
  if (!data) return "";

  return String.raw`\chemfig{\charge{${data.chargeSpec}}{${data.element.symbol}}}${data.ionCharge}`;
}
