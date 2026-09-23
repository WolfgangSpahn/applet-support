import { renderBlendedMarkdown } from '../../blended-marked/render';

export function renderPresentationMarkdown(
  markdown: string
): string {
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
      const body =
        renderBlendedMarkdown(verticalSlides[0]);

      renderedSlides.push(`
<section>
${body}
</section>`);

      continue;
    }

    // -----------------------------------------------------------------------
    // Vertical Reveal stack
    // -----------------------------------------------------------------------

    const renderedVerticalSlides = verticalSlides
      .map(slide => {
        const body =
          renderBlendedMarkdown(slide);

        return `
<section>
${body}
</section>`;
      })
      .join('\n');

    renderedSlides.push(`
<section>
${renderedVerticalSlides}
</section>`);
  }

  return renderedSlides.join('\n');
}