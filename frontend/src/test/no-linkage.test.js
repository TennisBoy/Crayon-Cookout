import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
import { join } from 'node:path'

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, files)
    else if (/\.(jsx?|ts)$/.test(entry)) files.push(full)
  }
  return files
}

const SOURCES = walk('src').filter(f => !f.includes('no-linkage.test'))

// Needles are built from parts so this file's own source text never
// contains the literal tokens it is asserting other files don't contain.
const NEEDLES = [
  ['base', '44'].join(''),
  '@radix-ui',
  ['class-variance', 'authority'].join('-'),
  'from "input-otp"',
  "from 'input-otp'",
]

describe('no removed-platform or shadcn linkage', () => {
  it.each(NEEDLES)(
    'no source file mentions %s',
    (needle) => {
      const offenders = SOURCES.filter(f => readFileSync(f, 'utf8').includes(needle))
      expect(offenders).toEqual([])
    }
  )

  it('the deleted shadcn components are gone', () => {
    const deleted = [
      'accordion', 'alert-dialog', 'alert', 'aspect-ratio', 'avatar', 'badge',
      'breadcrumb', 'calendar', 'card', 'carousel', 'chart', 'checkbox',
      'collapsible', 'command', 'context-menu', 'dialog', 'drawer',
      'dropdown-menu', 'form', 'hover-card', 'image', 'menubar',
      'navigation-menu', 'pagination', 'popover', 'progress', 'radio-group',
      'resizable', 'scroll-area', 'select', 'separator', 'sheet', 'sidebar',
      'skeleton', 'slider', 'sonner', 'switch', 'table', 'tabs', 'textarea',
      'toggle-group', 'toggle', 'tooltip',
    ]
    const present = deleted.filter(name => existsSync(`src/components/ui/${name}.jsx`))
    expect(present).toEqual([])
  })

  it('the seven kept components are still present', () => {
    for (const name of ['button', 'input', 'label', 'input-otp', 'toast', 'toaster', 'use-toast']) {
      expect(existsSync(`src/components/ui/${name}.jsx`)).toBe(true)
    }
  })

  it('components.json and app-params.js are gone', () => {
    expect(existsSync('components.json')).toBe(false)
    expect(existsSync('src/lib/app-params.js')).toBe(false)
  })
})
