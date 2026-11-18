import { useEffect } from 'react';

/**
 * Updates the browser favicon whenever the URL changes.
 * Falls back to the existing icon if the URL is empty.
 */
export function useDynamicFavicon(faviconUrl?: string | null) {
  useEffect(() => {
    if (!faviconUrl) return;
    let link = document.querySelector<HTMLLinkElement>("link[rel*='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = faviconUrl;
  }, [faviconUrl]);
}
