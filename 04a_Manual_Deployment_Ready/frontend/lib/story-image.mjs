// Treat model and storage responses as data, including image URLs.
export function storyImageUrl(image) {
  if (image.gcs_url && !image.gcs_error) {
    try {
      const url = new URL(image.gcs_url);
      if (url.protocol === 'https:' && !url.username && !url.password) return url.href;
    } catch { /* Fall back to a validated inline image. */ }
  }
  const format = String(image.format || '').toLowerCase().replace(/^jpg$/, 'jpeg');
  if (!['png', 'jpeg', 'gif', 'webp'].includes(format)) return '';
  if (typeof image.base64 !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(image.base64)) return '';
  return `data:image/${format};base64,${image.base64}`;
}

export function showStoryImage(newTab, imageUrl) {
  if (!newTab || !imageUrl) return;
  newTab.opener = null;
  const doc = newTab.document;
  doc.title = 'Story Frame';
  doc.body.style.cssText = 'margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#000';
  const image = doc.createElement('img');
  image.src = imageUrl;
  image.alt = 'Generated story frame';
  image.style.cssText = 'max-width:100%;max-height:100vh;object-fit:contain';
  doc.body.replaceChildren(image);
}
