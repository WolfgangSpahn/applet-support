import { getSharedPresentationImagePath } from './presentation-images';

/** Apply the shared AIDu presentation layout and image URL rules. */
export function preparePresentationSlides(
  slides: HTMLElement,
  markdownBaseUrl: string,
  staticAssetsOrigin?: string,
): void {
  slides.querySelectorAll<HTMLElement>(".v-cent").forEach((content) => {
    const slide = content.closest("section");
    if (slide && slide !== content) slide.classList.add("has-v-cent");
  });
  slides.querySelectorAll<HTMLImageElement>("img.absolute, img[data-attach=\"bottom\"]").forEach((image) => {
    const slide = image.closest("section");
    if (slide && image.parentElement !== slide) slide.append(image);
  });
  const base = new URL(markdownBaseUrl, document.baseURI);
  slides.querySelectorAll<HTMLImageElement>("img[src]").forEach((image) => {
    const raw = image.getAttribute("src");
    if (!raw) return;
    image.addEventListener("error", () => console.warn("[AIDu presentation] Image failed to load:", image.src), { once: true });
    const sharedPath = getSharedPresentationImagePath(raw);
    const resolved = sharedPath
      ? (staticAssetsOrigin ? new URL(sharedPath, staticAssetsOrigin).href : sharedPath)
      : new URL(raw, base).href;
    if (image.src !== resolved) image.src = resolved;
  });
}
