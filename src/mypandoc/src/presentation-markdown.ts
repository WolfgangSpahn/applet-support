import { renderBlendedMarkdown } from '../../blended-marked/render';
import { resolvePresentationImageUrl } from './presentation-images';

function extractSlideAlignment(markdown: string) {
  const classes = new Set<string>();
  const alignmentClasses = new Set(['h-cent', 'v-cent']);
  const headingAttributes = /^(\s{0,3}#{1,6}\s+.*?)\s+\{([^}\n]+)\}\s*$/gm;
  let output = markdown.replace(headingAttributes, (line, heading: string, attributes: string) => {
    const tokens = attributes.trim().split(/\s+/);
    const align = tokens.filter((token) => /^\.(h-cent|v-cent)$/.test(token));
    if (!align.length) return line;
    align.forEach((token) => classes.add(token.slice(1)));
    const remaining = tokens.filter((token) => !alignmentClasses.has(token.slice(1)));
    return heading + (remaining.length ? ` {${remaining.join(' ')}}` : '');
  });
  const lines = output.split(/\r?\n/);
  const firstContent = lines.findIndex((line) => line.trim().length > 0);
  let standaloneAttributeLine = firstContent;
  if (firstContent >= 0 && /^\s{0,3}#{1,6}\s+/.test(lines[firstContent])) {
    standaloneAttributeLine = lines.findIndex((line, index) => index > firstContent && line.trim().length > 0);
  }
  const standalone = standaloneAttributeLine >= 0
    ? /^(\s*)\{((?:\.[\w-]+\s*)+)\}\s*$/.exec(lines[standaloneAttributeLine])
    : null;
  if (standalone) {
    const tokens = standalone[2].trim().split(/\s+/);
    const align = tokens.filter((token) => /^\.(h-cent|v-cent)$/.test(token));
    if (align.length) {
      align.forEach((token) => classes.add(token.slice(1)));
      const remaining = tokens.filter((token) => !alignmentClasses.has(token.slice(1)));
      lines[standaloneAttributeLine] = remaining.length
        ? `${standalone[1]}{${remaining.join(' ')}}`
        : '';
      output = lines.join('\n');
    }
  }
  return { markdown: output, classes: [...classes] };
}

function renderSlide(markdown: string, imageResolver: (src: string) => string) {
  const aligned = extractSlideAlignment(markdown);
  const body = renderBlendedMarkdown(wrapDenseHeadingContent(aligned.markdown), { imageResolver });
  const classAttribute = aligned.classes.length ? ` class=\"${aligned.classes.join(' ')}\"` : '';
  return `<section${classAttribute}>\n${body}\n</section>`;
}

function wrapDenseHeadingContent(markdown: string) {
  const lines = markdown.split(/\r?\n/);
  const denseHeadingPattern = /^(\s{0,3}#{1,6}\s+.*?)\s+\{\.dense\}\s*$/;
  const headingIndex = lines.findIndex((line) => denseHeadingPattern.test(line));
  if (headingIndex < 0) return markdown;

  const heading = denseHeadingPattern.exec(lines[headingIndex]);
  if (!heading) return markdown;
  const content = lines.slice(headingIndex + 1).join('\n').trim();
  if (!content) {
    lines[headingIndex] = heading[1];
    return lines.join('\n');
  }

  return [
    ...lines.slice(0, headingIndex),
    heading[1],
    '',
    ':::{.dense-content}',
    content,
    ':::',
  ].join('\n');
}

export function renderPresentationMarkdown(
  markdown: string,
  staticAssetOrigin?: string,
): string {
  // Images in the shared lesson image directory are served by Nginx at /images.
  // The app can run on another port, so callers may provide the Nginx origin.
  const imageResolver = (src: string) => resolvePresentationImageUrl(src, staticAssetOrigin);
  const horizontalGroups = markdown
    .split(/^\s*---\s*$/m)
    .map(group => group.trim())
    .filter(Boolean);

  const renderedSlides: string[] = [];

  for (const group of horizontalGroups) {
    const verticalSlides = group
      .split(/^\s*--\s*$/m)
      .map(slide => slide.trim())
      .filter(Boolean);

    // -----------------------------------------------------------------------
    // Normal horizontal slide
    // -----------------------------------------------------------------------

    if (verticalSlides.length === 1) {
      renderedSlides.push(renderSlide(verticalSlides[0], imageResolver));

      continue;
    }

    // -----------------------------------------------------------------------
    // Vertical Reveal stack
    // -----------------------------------------------------------------------

    const renderedVerticalSlides = verticalSlides
      .map(slide => renderSlide(slide, imageResolver))
      .join('\n');

    renderedSlides.push(`
<section>
${renderedVerticalSlides}
</section>`);
  }

  return renderedSlides.join('\n');
}