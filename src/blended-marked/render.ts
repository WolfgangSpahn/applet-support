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
    restoredHtml = restoredHtml.replaceAll(key, replacement);
  }
  return restoredHtml;
}

function splitClasses(value?: string) {
  return value?.split(/\s+/).map((item) => item.trim()).filter(Boolean) ?? [];
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

function applyDomTransforms(html: string, options: BlendedMarkedOptions) {
  const template = document.createElement('template');
  template.innerHTML = html;
  const classes = options.classNames ?? {};
  let titleApplied = false;

  template.content.querySelectorAll('p').forEach((node) => {
    node.classList.add(...splitClasses(classes.paragraph));
  });
  template.content.querySelectorAll('h1').forEach((node) => {
    node.classList.add(...splitClasses(classes.h1));
    if (options.titleId && !titleApplied) {
      node.id = options.titleId;
      titleApplied = true;
    }
  });
  template.content.querySelectorAll('h2').forEach((node) => {
    node.classList.add(...splitClasses(classes.h2));
    if (options.titleId && !titleApplied) {
      node.id = options.titleId;
      titleApplied = true;
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
  const { protectedText, placeholders } = protectInlineRenderables(markdown.trim());
  let html = marked.parse(protectedText, { async: false }) as string;
  html = applyDomTransforms(html, options);
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
      'text-anchor',
      'font-size',
      'font-family',
      'marker-end',
    ],
  });
}
