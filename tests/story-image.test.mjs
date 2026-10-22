import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { DOMParser } from 'linkedom';

const root = new URL('../', import.meta.url);
for (const chapter of (await readdir(root)).filter(name => /^0[1-5][ab]_/.test(name))) {
  test(`${chapter}: image responses cannot inject markup or navigate to script URLs`, async () => {
    const { storyImageUrl, showStoryImage } = await import(new URL(`${chapter}/frontend/lib/story-image.mjs`, root));
    const png = { format: 'png', base64: 'aGVsbG8=' };
    assert.equal(storyImageUrl(png), 'data:image/png;base64,aGVsbG8=');
    assert.equal(storyImageUrl({ ...png, gcs_url: 'https://storage.googleapis.com/bucket/image.png' }), 'https://storage.googleapis.com/bucket/image.png');
    for (const url of ['javascript:alert(1)', 'data:text/html,<script>alert(1)</script>', 'http://example.com/x', 'https://user:pass@example.com/x']) {
      assert.equal(storyImageUrl({ format: 'png', gcs_url: url }), '');
    }
    for (const image of [{format:'svg+xml',base64:'aGVsbG8='},{format:'png',base64:'" onerror="alert(1)'}]) assert.equal(storyImageUrl(image), '');
    let children;
    const tab = { opener: {}, document: { body: { style: {}, replaceChildren: (...nodes) => { children = nodes; } }, createElement: tag => ({ tag, style: {} }), write: () => { throw new Error('HTML interpolation is prohibited'); } } };
    const url = storyImageUrl({gcs_url:'https://storage.googleapis.com/bucket/x" onerror="alert(1)',format:'png'});
    showStoryImage(tab, url);
    assert.equal(tab.opener, null);
    assert.equal(children.length, 1);
    assert.equal(children[0].tag, 'img');
    assert.equal(children[0].src, url);
    assert.equal(children[0].onerror, undefined);
    const malicious = 'https://storage.googleapis.com/bucket/x\"><script>alert(1)</script><img src=\"x';
    const baseline = new DOMParser().parseFromString(`<html><body><img src="${malicious}"></body></html>`, 'text/html');
    assert.equal(baseline.querySelectorAll('script').length, 1, 'fixture demonstrates the previous HTML injection');
    const document = new DOMParser().parseFromString('<html><head></head><body></body></html>', 'text/html');
    showStoryImage({ document, opener: {} }, storyImageUrl({ gcs_url: malicious, format: 'png' }));
    assert.equal(document.querySelectorAll('script,iframe,object,[onerror],[onload]').length, 0);
    assert.equal(document.body.children.length, 1);
    assert.equal(document.body.firstElementChild.tagName, 'IMG');
    const source = await readFile(new URL(`${chapter}/frontend/components/story-frames.tsx`, root), 'utf8');
    assert.ok(!source.includes('document.write'));
    assert.ok(source.includes("'noopener,noreferrer'"));
  });
}
