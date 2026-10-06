import presentationStyles from '../styles.css?inline';

const PRINT_STYLES = `
  @media screen { body { margin: 0; } }
  @media print {
    #print-instructions { display: none !important; }
    html.reveal-print { width: 100%; height: 100%; overflow: visible; }
    html.reveal-print * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    html.reveal-print body { margin: 0 auto !important; border: 0; padding: 0; float: none !important; overflow: visible; }
    html.reveal-print .aidu-presentation-activity { width: auto !important; height: auto !important; overflow: visible !important; }
    html.reveal-print .reveal { width: auto !important; height: auto !important; overflow: hidden !important; }
    html.reveal-print .reveal .slides { position: static !important; display: block !important; width: 100% !important; height: auto !important; margin: 0 !important; padding: 0 !important; overflow: visible !important; transform: none !important; perspective: none !important; }
    html.reveal-print .reveal .slides .pdf-page { position: relative; overflow: hidden; z-index: 1; break-after: page; page-break-after: always; }
    html.reveal-print .reveal .slides .pdf-page:last-of-type { break-after: avoid; page-break-after: avoid; }
    html.reveal-print .reveal .slides section { display: block !important; visibility: visible !important; position: absolute !important; box-sizing: border-box !important; min-height: 1px; margin: 0 !important; padding: 24px 0 0 !important; opacity: 1 !important; transform: none !important; transform-style: flat !important; }
    html.reveal-print .reveal .backgrounds, html.reveal-print .reveal .controls, html.reveal-print .reveal .progress, html.reveal-print .reveal .playback, html.reveal-print .reveal .aria-status { display: none !important; }
    html.reveal-print .reveal pre code { overflow: hidden !important; }
    html.reveal-print .reveal img { box-shadow: none; }
  }
  .reveal { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-size: 32px; }
  .reveal .slides { text-align: left; }
  .reveal .slides section { box-sizing: border-box; padding-top: 24px; }
  .reveal .centered-xxl-text { font-size: 64px; text-align: center; font-weight: bold; }
  .reveal .dense-content { zoom: .8; width: 100%; }
  .reveal .text-3xl, .reveal .text-3xl * { font-size: 1.875rem !important; }
  .reveal .text-2xl, .reveal .text-2xl * { font-size: 1.5rem !important; }
  .reveal .text-xl, .reveal .text-xl * { font-size: 1.25rem !important; }
  .reveal .text-lg, .reveal .text-lg * { font-size: 1.125rem !important; }
  .reveal .text-base, .reveal .text-base * { font-size: 1rem !important; }
  .reveal .text-sm, .reveal .text-sm * { font-size: .875rem !important; }
  .reveal .text-xs, .reveal .text-xs * { font-size: .75rem !important; }
  .reveal .text-2xs, .reveal .text-2xs * { font-size: .625rem !important; }
  .reveal .text-3xs, .reveal .text-3xs * { font-size: .5rem !important; }
  .reveal .slides ul > li, .reveal .slides ol > li { font-size: x-large; }
  .reveal .slides ul ul > li, .reveal .slides ol ol > li { font-size: large; }
  .reveal .slides ul ul ul > li, .reveal .slides ol ol ol > li { font-size: medium; }
  .reveal .slides ul ul ul ul > li, .reveal .slides ol ol ol ol > li { font-size: small; }
  .reveal h1, .reveal h2, .reveal h3, .reveal h4 { text-transform: none; }
  .reveal h1 { font-size: 3.25em; }
  .reveal h2 { font-size: 2em; }
  .reveal h1 { font-family: "Courier New", monospace; color: #a3002f; font-weight: bold; }
  .reveal h2 { font-family: "Courier New", monospace; margin-bottom: 40px; color: #a3002f; font-weight: 600; }
  .reveal h3 { margin-left: 1.5rem; font-size: 1.15em; }
  .reveal h3 ~ * { margin-left: 1.5rem; }
  .reveal pre { width: 100%; }
  .reveal blockquote { display: block; position: relative; width: unset; margin: var(--r-block-margin, 12px) auto; padding: .625rem 1.75rem; border-left: .25rem solid #707070; color: #707070; font-style: normal; background: none; box-shadow: none; }
  .reveal blockquote p:first-child, .reveal blockquote p:last-child { display: block; }
  .important { padding: 1rem 1.25rem; border-left: 4px solid #666; background: #f3f4f6; }
  .image-small img { width: 30%; } .image-medium img { width: 50%; } .image-large img { width: 80%; }
  .compact-table { width: 80%; margin-inline: auto; font-size: .68em; }
  .compact-table table { width: 100%; border-collapse: collapse; }
  .compact-table th, .compact-table td { padding: .12em .3em; line-height: 1.1; vertical-align: middle; }
  .compact-table th p, .compact-table td p { margin: 0; }
  .compact-table td:first-child { white-space: nowrap; }
  .compact-table td:nth-child(2) { width: 3em; min-width: 3em; text-align: center; }
  .compact-table img { display: inline-block; height: 30px; max-height: 30px; width: auto; max-width: none; vertical-align: middle; }
  .columns { display: flex; flex-flow: row nowrap; align-items: stretch; gap: 1em; width: 100%; }
  .columns > .column { box-sizing: border-box; flex: 1 1 0; min-width: 0; }
  .columns > .column > :not(ul, ol) { margin-right: .25rem; margin-left: .25rem; }
  .columns > .column:first-child > :not(ul, ol) { margin-right: .5rem; margin-left: 0; }
  .columns > .column:last-child > :not(ul, ol) { margin-right: 0; margin-left: .5rem; }
  .columns img { max-width: 100%; height: auto; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; align-items: center; }
  .two-col .column { min-width: 0; } .two-col img { max-width: 100%; height: auto; }
  #print-instructions { margin: 0; padding: .85rem 1rem; background: #a3002f; color: #fff; font: 700 16px/1.4 "Courier New", monospace; text-align: center; }
`;

function escapeAttribute(value: string): string {
  const entities: Record<string, string> = {
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  };
  return value.replace(/[&<>"']/g, (character) => entities[character]);
}

/** Open a standalone MyPandoc-style Reveal document in print mode. */
export function openPresentationPrintTab(slides: string, title: string, baseUrl: string): void {
  const standaloneHtml = `<!doctype html>
<html><head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <base href="${escapeAttribute(baseUrl)}">
  <title>${escapeAttribute(title)}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@6.0.2/dist/reveal.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@6.0.2/dist/theme/white.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.22/dist/katex.min.css">
  <style>${PRINT_STYLES}\n${presentationStyles}</style>
</head><body>
  <p id="print-instructions" role="status">Use Ctrl+P (⌘P on Mac) to print or save this presentation as a PDF. Ctrl+w (⌘W on Mac)  to close this tab.</p>
  <div class="aidu-presentation-activity"><div class="reveal aidu-presentation-activity__reveal"><div class="slides">${slides}</div></div></div>
  <script src="https://cdn.jsdelivr.net/npm/reveal.js@6.0.2/dist/reveal.js"></script>
  <script>
    Reveal.initialize({ view: 'print', hash: false, controls: false, progress: false, center: false,
      slideNumber: false, width: 1050, height: 700, margin: 0.04, transition: 'none' });
  </script>
</body></html>`;

  // Write into a user-initiated about:blank tab. Some embedded browsers deny
  // scripts access to blob: URLs, while an opened blank tab inherits this page's
  // origin and can host the standalone HTML directly.
  const printTab = window.open('', '_blank');
  if (!printTab) {
    throw new Error('The print presentation tab was blocked. Allow pop-ups and try again.');
  }

  try {
    printTab.document.open();
    printTab.document.write(standaloneHtml);
    printTab.document.close();
    if (!printTab.document.querySelector('.reveal .slides')) {
      throw new Error('The new tab did not accept the standalone presentation document.');
    }
  } catch (cause) {
    printTab.close();
    console.error('[AIDu presentation print] Browser blocked writing the standalone print tab.', cause);
    throw new Error('This browser blocks generated print tabs. Open AIDu in Firefox or Chrome to print this presentation.');
  }
  printTab.opener = null;
  console.info('[AIDu presentation print] Wrote standalone Reveal print view into a new tab.', { title, slideCount: (slides.match(/<section\b/g) ?? []).length });
}
