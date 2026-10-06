/**
 * Switches a live Reveal deck into its printable page structure, prints it,
 * then restores the original slide DOM and presentation position.
 * The page transformation follows Reveal.js PrintView (MIT, Hakim El Hattab).
 */
export interface RevealPrintApi {
  getConfig(): Record<string, any>;
  getRevealElement(): HTMLElement | null;
  getSlidesElement(): HTMLElement | null;
  getViewportElement(): HTMLElement | null;
  getComputedSlideSize(width?: number, height?: number): { width: number; height: number };
  getIndices(): { h: number; v: number; f?: number };
  getSlideNotes(slide: HTMLElement): string | null;
  layoutSlideContents?(width: number, height: number): void;
  layout(): void;
  slide(h: number, v?: number, f?: number): void;
  sync(): void;
}

const nextFrame = () => Promise.race([
  new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
  new Promise<void>((resolve) => window.setTimeout(resolve, 500)),
]);

/** Apply Reveal's PDF print layout to the live slide DOM and invoke browser print. */
export async function printRevealPresentation(deck: RevealPrintApi): Promise<void> {
  console.info('[AIDu presentation print] Preparing print layout.');
  const root = deck.getRevealElement();
  const slidesElement = deck.getSlidesElement();
  const viewport = deck.getViewportElement();
  if (!root || !slidesElement || !viewport) {
    console.error('[AIDu presentation print] Reveal DOM is incomplete.', { root: Boolean(root), slidesElement: Boolean(slidesElement), viewport: Boolean(viewport) });
    throw new Error('Reveal presentation is not ready for printing.');
  }

  const config = deck.getConfig();
  const indices = deck.getIndices();
  const sourceMarkup = slidesElement.innerHTML;
  const bodyWidth = document.body.style.width;
  const bodyHeight = document.body.style.height;
  const originalClasses = ['reveal-print', 'print-pdf', 'aidu-reveal-print-mode']
    .filter((name) => document.documentElement.classList.contains(name));
  let printStyle: HTMLStyleElement | undefined;
  let restored = false;

  const restore = () => {
    if (restored) return;
    restored = true;
    window.removeEventListener('afterprint', restore);
    slidesElement.innerHTML = sourceMarkup;
    ['reveal-print', 'print-pdf', 'aidu-reveal-print-mode'].forEach((name) => {
      if (!originalClasses.includes(name)) document.documentElement.classList.remove(name);
    });
    document.body.style.width = bodyWidth;
    document.body.style.height = bodyHeight;
    printStyle?.remove();
    deck.sync();
    deck.slide(indices.h, indices.v, indices.f);
    console.info('[AIDu presentation print] Original slide DOM and position restored.', indices);
  };

  try {
    document.documentElement.classList.add('aidu-reveal-print-mode');
    if (document.fonts) {
      console.info('[AIDu presentation print] Waiting for document fonts.');
      await Promise.race([document.fonts.ready, new Promise<void>((resolve) => window.setTimeout(resolve, 5000))]);
      console.info('[AIDu presentation print] Font wait finished.', { status: document.fonts.status });
    }
    const images = Array.from(slidesElement.querySelectorAll<HTMLImageElement>('img'));
    console.info('[AIDu presentation print] Waiting for slide images.', { imageCount: images.length });
    const pendingImages = images.filter((image) => !image.complete);
    if (pendingImages.length) {
      await Promise.race([
        Promise.all(pendingImages.map((image) => new Promise<void>((resolve) => {
          image.addEventListener('load', () => resolve(), { once: true });
          image.addEventListener('error', () => resolve(), { once: true });
        }))),
        new Promise<void>((resolve) => window.setTimeout(resolve, 8000)),
      ]);
    }
    const failedImages = images.filter((image) => image.complete && image.naturalWidth === 0);
    const stillLoadingImages = images.filter((image) => !image.complete);
    console.info('[AIDu presentation print] Image wait finished.', {
      imageCount: images.length,
      pendingAtStart: pendingImages.length,
      failedImageCount: failedImages.length,
      failedImageSources: failedImages.map((image) => image.currentSrc || image.src),
      stillLoadingImageSources: stillLoadingImages.map((image) => image.currentSrc || image.src),
    });

    const slideSize = deck.getComputedSlideSize(window.innerWidth, window.innerHeight);
    console.info('[AIDu presentation print] Browser environment and slide size.', { userAgent: navigator.userAgent, innerWidth: window.innerWidth, innerHeight: window.innerHeight, slideSize });
    const pageWidth = Math.floor(slideSize.width * (1 + Number(config.margin ?? 0.04)));
    const pageHeight = Math.floor(slideSize.height * (1 + Number(config.margin ?? 0.04)));
    const pageHeightOffset = Number(config.pdfPageHeightOffset ?? -1);
    printStyle = document.createElement('style');
    printStyle.textContent = `@page{size:${pageWidth}px ${pageHeight}px;margin:0}`;
    document.head.appendChild(printStyle);
    document.documentElement.classList.add('reveal-print', 'print-pdf');
    document.body.style.width = `${pageWidth}px`;
    document.body.style.height = `${pageHeight}px`;

    console.info('[AIDu presentation print] Waiting for print-layout frame.');
    await nextFrame();
    if (deck.layoutSlideContents) deck.layoutSlideContents(slideSize.width, slideSize.height);
    else deck.layout();
    await nextFrame();
    console.info('[AIDu presentation print] Reveal layout completed.');

    const slides = Array.from(root.querySelectorAll<HTMLElement>('.slides section'));
    console.info('[AIDu presentation print] Building printable pages.', { slideCount: slides.length, pageWidth, pageHeight });
    const heights = slides.map((slide) => slide.scrollHeight);
    const pages: HTMLElement[] = [];
    const showNumbers = Boolean(config.slideNumber) && /all|print/i.test(String(config.showSlideNumber ?? 'all'));
    let slideNumber = 1;

    slides.forEach((slide, index) => {
      if (slide.classList.contains('stack')) return;
      const pageCount = Math.min(
        Math.max(Math.ceil(heights[index] / pageHeight), 1),
        Number(config.pdfMaxPagesPerSlide ?? Number.POSITIVE_INFINITY),
      );
      const page = document.createElement('div');
      page.className = 'pdf-page';
      page.style.height = `${(pageHeight + pageHeightOffset) * pageCount}px`;
      const background = window.getComputedStyle(viewport).background;
      if (background) page.style.background = background;
      page.appendChild(slide);
      slide.style.left = `${Math.floor((pageWidth - slideSize.width) / 2)}px`;
      slide.style.top = `${Math.max(Math.floor((pageHeight - slideSize.height) / 2), 0)}px`;
      slide.style.width = `${slideSize.width}px`;
      slide.querySelectorAll<HTMLElement>('.fragment:not(.fade-out)').forEach((fragment) => fragment.classList.add('visible'));

      if (config.showNotes) {
        const notes = deck.getSlideNotes(slide);
        if (notes) {
          const notePage = document.createElement('div');
          notePage.className = 'speaker-notes speaker-notes-pdf';
          notePage.innerHTML = notes;
          page.appendChild(notePage);
        }
      }
      if (showNumbers) {
        const number = document.createElement('div');
        number.className = 'slide-number slide-number-pdf';
        number.textContent = String(slideNumber);
        page.appendChild(number);
      }
      slideNumber += 1;
      pages.push(page);
    });

    console.info('[AIDu presentation print] Waiting to insert printable pages.');
    await nextFrame();
    pages.forEach((page) => slidesElement.appendChild(page));
    if (deck.layoutSlideContents) deck.layoutSlideContents(slideSize.width, slideSize.height);
    else deck.layout();
    await nextFrame();

    window.addEventListener('afterprint', () => {
      console.info('[AIDu presentation print] Browser afterprint event received; restoring presentation.');
      restore();
    }, { once: true });
    console.info('[AIDu presentation print] Calling window.print().');
    window.print();
    console.info('[AIDu presentation print] window.print() returned.');
  } catch (error) {
    console.error('[AIDu presentation print] Print preparation failed; restoring presentation.', error);
    restore();
    throw error;
  }
}
