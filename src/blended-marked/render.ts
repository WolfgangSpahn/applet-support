/*
 * Copyright (C) 2026 Dr. Wolfgang Spahn, PHBern
 *
 * MIT License — see LICENSE file for details.
 * If you use this software in academic work, citation of the original author is requested.
 */
import DOMPurify from 'dompurify';
import katex from 'katex';
import { marked } from 'marked';
import { chemfigLewisToSvg } from '../chemfig/chemfig';
import 'katex/dist/katex.min.css';

export interface BlendedMarkedClassNames {
  paragraph?: string;
  h1?: string;
  h2?: string;
  h3?: string;
  image?: string;
}

export interface BlendedMarkedOptions {
  titleId?: string;
  imageResolver?: (src: string) => string;
  classNames?: BlendedMarkedClassNames;
}

interface RenderState {
  titleApplied: boolean;
}

interface FencedDivInfo {
  classes: string[];
  attributes: Record<string, string>;
  fenceLength: number;
}

type PlaceholderKind = 'DISPLAY_MATH' | 'INLINE_MATH' | 'CHEMFIG';

interface Placeholder {
  kind: PlaceholderKind;
  value: string;
}

const placeholderPrefix = 'AIDU_BLEND_';

marked.setOptions({ breaks: true, gfm: true });

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function protectPattern(
  text: string,
  placeholders: Record<string, Placeholder>,
  regex: RegExp,
  kind: PlaceholderKind,
) {
  return text.replace(regex, (_match, value) => {
    const key = `${placeholderPrefix}${Object.keys(placeholders).length}_${kind}`;
    placeholders[key] = { kind, value: String(value).trim() };
    return key;
  });
}

function findBalancedBraceEnd(text: string, openBraceIndex: number) {
  let depth = 0;
  for (let index = openBraceIndex; index < text.length; index += 1) {
    const char = text[index];
    if (char === '\\') {
      index += 1;
      continue;
    }
    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }
  return -1;
}

function protectChemfig(text: string, placeholders: Record<string, Placeholder>) {
  let output = '';
  let cursor = 0;
  const prefix = '\\chemfig{';

  while (cursor < text.length) {
    const start = text.indexOf(prefix, cursor);
    if (start === -1) {
      output += text.slice(cursor);
      break;
    }

    const openBraceIndex = start + '\\chemfig'.length;
    const end = findBalancedBraceEnd(text, openBraceIndex);
    if (end === -1) {
      output += text.slice(cursor);
      break;
    }

    let expressionEnd = end + 1;
    const ionCharge = text.slice(expressionEnd).match(/^\^\{[+-]\}/);
    if (ionCharge) {
      expressionEnd += ionCharge[0].length;
    }

    const key = `${placeholderPrefix}${Object.keys(placeholders).length}_CHEMFIG`;
    placeholders[key] = { kind: 'CHEMFIG', value: text.slice(start, expressionEnd) };
    output += text.slice(cursor, start) + key;
    cursor = expressionEnd;
  }

  return output;
}

function protectInlineRenderables(text: string) {
  const placeholders: Record<string, Placeholder> = {};
  let protectedText = protectChemfig(text, placeholders);

  protectedText = protectPattern(protectedText, placeholders, /\$\$([\s\S]*?)\$\$/g, 'DISPLAY_MATH');
  protectedText = protectPattern(protectedText, placeholders, /\\\[([\s\S]*?)\\\]/g, 'DISPLAY_MATH');
  protectedText = protectPattern(protectedText, placeholders, /\\\(([\s\S]*?)\\\)/g, 'INLINE_MATH');
  protectedText = protectPattern(protectedText, placeholders, /(?<!\$)\$([^\$\n]+)\$(?!\$)/g, 'INLINE_MATH');

  return { protectedText, placeholders };
}

function renderMath(value: string, displayMode: boolean) {
  try {
    const html = katex.renderToString(value, {
      displayMode,
      throwOnError: false,
      strict: false,
    });
    return displayMode
      ? `<div class="math-display">${html}</div>`
      : `<span class="math-inline">${html}</span>`;
  } catch {
    return `<code>${escapeHtml(value)}</code>`;
  }
}

function renderChemfig(value: string) {
  try {
    return `<span class="chemfig-inline">${chemfigLewisToSvg(value)}</span>`;
  } catch {
    return `<code>${escapeHtml(value)}</code>`;
  }
}

function restorePlaceholders(html: string, placeholders: Record<string, Placeholder>) {
  let restoredHtml = html;
  for (const [key, placeholder] of Object.entries(placeholders)) {
    const replacement = placeholder.kind === 'CHEMFIG'
      ? renderChemfig(placeholder.value)
      : renderMath(placeholder.value, placeholder.kind === 'DISPLAY_MATH');
    restoredHtml = restoredHtml.split(key).join(replacement);
  }
  return restoredHtml;
}

function splitClasses(value?: string) {
  return value?.split(/\s+/).map((item) => item.trim()).filter(Boolean) ?? [];
}

function escapeAttribute(value: string) {
  return escapeHtml(value).replace(/`/g, '&#96;');
}

function parseFencedDivInfo(line: string): FencedDivInfo | null {
  const match =
    /^\s*(:{3,})\s*\{([^}]*)\}\s*$/.exec(line);

  if (!match) {
    return null;
  }

  const fenceLength = match[1].length;

  const classes: string[] = [];
  const attributes: Record<string, string> = {};

  const tokens =
    match[2].match(
      /\.[A-Za-z0-9_-]+|[A-Za-z0-9_-]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s]+)|[A-Za-z0-9_-]+/g
    ) ?? [];

  for (const token of tokens) {
    const classMatch =
      /^\.([A-Za-z0-9_-]+)$/.exec(token);

    if (classMatch) {
      classes.push(classMatch[1]);
      continue;
    }

    const attributeMatch =
      /^([A-Za-z0-9_-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s]+))$/.exec(token);

    if (attributeMatch) {
      attributes[attributeMatch[1]] =
        attributeMatch[2]
        ?? attributeMatch[3]
        ?? attributeMatch[4]
        ?? '';

      continue;
    }

    if (!token.startsWith('.')) {
      classes.push(token);
    }
  }

  return {
    classes,
    attributes,
    fenceLength,
  };
}

function getClosingFenceLength(line: string): number | null {
  const match =
    /^\s*(:{3,})\s*$/.exec(line);

  return match
    ? match[1].length
    : null;
}

function isClosingFencedDiv(line: string) {
  return /^\s*:::\s*$/.test(line);
}

function isOpeningFencedDiv(line: string) {
  return parseFencedDivInfo(line);
}

function renderFencedDiv(info: FencedDivInfo, content: string) {
  const classNames = info.classes.map((item) => escapeAttribute(item)).join(' ');
  const attributeEntries = Object.entries(info.attributes).map(([key, value]) => ` data-${escapeAttribute(key)}="${escapeAttribute(value)}"`);
  const classAttribute = classNames ? ` class="${classNames}"` : '';
  return `<div${classAttribute}${attributeEntries.join('')}>${content}</div>`;
}

function renderMarkdownFragment(markdown: string, options: BlendedMarkedOptions, state: RenderState) {
  const { protectedText, placeholders } = protectInlineRenderables(markdown.trim());
  let html = marked.parse(protectedText, { async: false }) as string;
  html = applyDomTransforms(html, options, state);
  html = restorePlaceholders(html, placeholders);

  return DOMPurify.sanitize(html, {
    ADD_TAGS: ['svg', 'path', 'g', 'line', 'circle', 'ellipse', 'polygon', 'polyline', 'text', 'defs', 'marker', 'rect', 'span'],
    ADD_ATTR: [
      'class',
      'style',
      'href',
      'target',
      'rel',
      'src',
      'alt',
      'title',
      'loading',
      'viewBox',
      'width',
      'height',
      'x',
      'y',
      'x1',
      'x2',
      'y1',
      'y2',
      'cx',
      'cy',
      'r',
      'rx',
      'ry',
      'd',
      'points',
      'transform',
      'fill',
      'stroke',
      'stroke-width',
      'stroke-linecap',
      'stroke-linejoin',
      'data-width',
    ],
  });
}

function renderMarkdownBlocks(markdown: string, options: BlendedMarkedOptions, state: RenderState) {
  const normalized = markdown.trim();
  if (!normalized) {
    return '';
  }

  const lines = normalized.split(/\r?\n/);
  const output: string[] = [];
  let plainStart = 0;
  let index = 0;

  while (index < lines.length) {
    const opening = isOpeningFencedDiv(lines[index]);
    if (!opening) {
      index += 1;
      continue;
    }

    let depth = 1;
    let closingIndex = -1;

    for (
      let nestedIndex = index + 1;
      nestedIndex < lines.length;
      nestedIndex += 1
    ) {
      const closingFenceLength =
        getClosingFenceLength(lines[nestedIndex]);

      if (
        closingFenceLength !== null &&
        closingFenceLength >= opening.fenceLength
      ) {
        closingIndex = nestedIndex;
        break;
      }
    }

    if (closingIndex === -1) {
      index += 1;
      continue;
    }

    if (plainStart < index) {
      output.push(renderMarkdownFragment(lines.slice(plainStart, index).join('\n'), options, state));
    }

    const innerMarkdown = lines.slice(index + 1, closingIndex).join('\n');
    const renderedInner = renderMarkdownBlocks(innerMarkdown, options, state);
    output.push(renderFencedDiv(opening, renderedInner));

    index = closingIndex + 1;
    plainStart = index;
  }

  if (plainStart < lines.length) {
    output.push(renderMarkdownFragment(lines.slice(plainStart).join('\n'), options, state));
  }

  return output.join('');
}

function resolveImageSource(src: string, imageResolver?: (src: string) => string) {
  const resolved = imageResolver?.(src) ?? src;
  try {
    const url = new URL(resolved);
    const fileMatch = /\/wiki\/File:([^?#]+)/.exec(url.pathname)
      ?? /^#\/media\/File:([^?#]+)/.exec(url.hash);
    if (url.hostname === 'commons.wikimedia.org' && fileMatch) {
      return `https://commons.wikimedia.org/wiki/Special:Redirect/file/${fileMatch[1]}`;
    }
  } catch {
    return resolved;
  }
  return resolved;
}

function applyDomTransforms(html: string, options: BlendedMarkedOptions, state: RenderState) {
  const template = document.createElement('template');
  template.innerHTML = html;
  const classes = options.classNames ?? {};

  template.content.querySelectorAll('p').forEach((node) => {
    node.classList.add(...splitClasses(classes.paragraph));
  });
  template.content.querySelectorAll('h1').forEach((node) => {
    node.classList.add(...splitClasses(classes.h1));
    if (options.titleId && !state.titleApplied) {
      node.id = options.titleId;
      state.titleApplied = true;
    }
  });
  template.content.querySelectorAll('h2').forEach((node) => {
    node.classList.add(...splitClasses(classes.h2));
    if (options.titleId && !state.titleApplied) {
      node.id = options.titleId;
      state.titleApplied = true;
    }
  });
  template.content.querySelectorAll('h3').forEach((node) => {
    node.classList.add(...splitClasses(classes.h3));
  });
  template.content.querySelectorAll('img').forEach((node) => {
    node.classList.add(...splitClasses(classes.image));
    node.setAttribute('loading', 'lazy');
    const src = node.getAttribute('src');
    if (src) {
      node.setAttribute('src', resolveImageSource(src, options.imageResolver));
    }
  });
  template.content.querySelectorAll('a').forEach((node) => {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noreferrer');
  });

  return template.innerHTML;
}

export function renderBlendedMarkdown(markdown: string, options: BlendedMarkedOptions = {}) {
  return renderMarkdownBlocks(markdown, options, { titleApplied: false });
}
