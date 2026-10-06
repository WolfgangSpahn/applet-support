/** Return the Nginx shared-image route for local or already-rooted image paths. */
export function getSharedPresentationImagePath(source: string): string | undefined {
  const suffixIndex = source.search(/[?#]/);
  const pathname = suffixIndex < 0 ? source : source.slice(0, suffixIndex);
  const suffix = suffixIndex < 0 ? '' : source.slice(suffixIndex);
  const localPath = pathname.replace(/^file:\/\/+/i, '/');
  const match = /(?:^|\/)images\/(.+)$/.exec(localPath);
  return match ? `/images/${match[1]}${suffix}` : undefined;
}

/** Resolve shared lesson images through Nginx when an origin is available. */
export function resolvePresentationImageUrl(source: string, staticAssetsOrigin?: string): string {
  const sharedPath = getSharedPresentationImagePath(source);
  if (!sharedPath) return source;
  return staticAssetsOrigin ? new URL(sharedPath, staticAssetsOrigin).href : sharedPath;
}
