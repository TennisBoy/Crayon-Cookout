// The favicon is referenced from two places that must agree: the <link> in
// index.html (browser tab) and the icons array in manifest.json (installed
// PWA). Two separate bugs make this worth a test rather than a review comment:
//
//   - `serve -s` rewrites any unmatched path to index.html, so a favicon that
//     is referenced but missing is served as HTML with a 200. That shipped
//     once and went unnoticed for weeks — the status code looks fine.
//   - Browsers cache favicons far harder than other assets; a normal reload
//     does not refetch them. Shipping a *new* mark to returning visitors needs
//     a versioned URL, so the version query is load-bearing, not decoration.
//
// If the two references drift apart, the tab and the installed icon disagree
// and only one of them busts its cache.
import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

// Vitest's root is frontend/, which is where index.html and public/ live.
const read = (rel) => readFileSync(resolve(process.cwd(), rel), 'utf8')

const iconHref = read('index.html').match(/<link\s+rel="icon"[^>]*href="([^"]+)"/)?.[1]
const manifestIcons = JSON.parse(read('public/manifest.json')).icons

describe('favicon wiring', () => {
  it('is referenced from index.html', () => {
    expect(iconHref).toBeDefined()
  })

  it('resolves to a file that exists in public/', () => {
    const [path] = iconHref.split('?')
    expect(existsSync(resolve(process.cwd(), 'public', path.replace(/^\//, '')))).toBe(true)
  })

  it('carries a version query so returning visitors refetch a changed mark', () => {
    expect(iconHref).toMatch(/\?v=\d+$/)
  })

  it('is referenced identically by the manifest, so tab and PWA icons agree', () => {
    expect(manifestIcons.map((i) => i.src)).toContain(iconHref)
  })
})
