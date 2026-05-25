import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const repoRoot = process.cwd()
const productionRoots = ['app', 'proxy.ts', 'next.config.ts']
const forbiddenPatterns = [
  /\bDEMO_[A-Z0-9_]+\b/,
  /VITE_AGENTCOST_DEMO_SEED/,
  /createMemory(?:KvStore|VectorStore)/,
  /runtimeMode:\s*['"]preview['"]/,
]

function listFiles(path: string): string[] {
  if (!existsSync(path)) return []
  const statFiles: string[] = []
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    const fullPath = join(path, entry.name)
    if (entry.isDirectory()) statFiles.push(...listFiles(fullPath))
    else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) statFiles.push(fullPath)
  }
  return statFiles
}

describe('Next production import guard', () => {
  it('has a Next App Router production surface', () => {
    expect(existsSync(join(repoRoot, 'app'))).toBe(true)
    expect(existsSync(join(repoRoot, 'app', 'layout.tsx'))).toBe(true)
    expect(existsSync(join(repoRoot, 'next.config.ts'))).toBe(true)
    expect(existsSync(join(repoRoot, 'proxy.ts'))).toBe(true)
  })

  it('keeps production Next routes free of demo and memory fallback imports', () => {
    const files = productionRoots.flatMap(root => {
      const absolute = join(repoRoot, root)
      return existsSync(absolute) && root.endsWith('.ts') ? [absolute] : listFiles(absolute)
    })

    expect(files.length).toBeGreaterThan(0)

    const violations = files.flatMap(file => {
      const source = readFileSync(file, 'utf8')
      return forbiddenPatterns
        .filter(pattern => pattern.test(source))
        .map(pattern => `${relative(repoRoot, file)} matched ${pattern}`)
    })

    expect(violations).toEqual([])
  })

  it('makes Next the primary frontend command while keeping Vite as legacy', () => {
    const packageJson = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8')) as {
      scripts: Record<string, string>
    }

    expect(packageJson.scripts.dev).toBe('next dev')
    expect(packageJson.scripts.build).toBe('next build')
    expect(packageJson.scripts.start).toBe('next start')
    expect(packageJson.scripts['legacy:vite:dev']).toBe('vite')
    expect(packageJson.scripts['legacy:vite:build']).toBe('tsc -p tsconfig.app.json && tsc -p tsconfig.node.json && vite build')
  })

  it('uses the shared role projection layout policy in the Next workspace route', () => {
    const source = readFileSync(join(repoRoot, 'app', '(app)', 'w', '[workspaceId]', 'page.tsx'), 'utf8')

    expect(source).toContain('buildRoleWorkspaceLayout')
    expect(source).toContain('COST_STAGE_CARDS')
  })

  it('keeps migrated production APIs on App Router and marks root api as legacy-only', () => {
    expect(existsSync(join(repoRoot, 'app', 'api', 'decisions', 'route.ts'))).toBe(true)
    expect(existsSync(join(repoRoot, 'app', 'api', 'usage', 'import', 'route.ts'))).toBe(true)
    expect(existsSync(join(repoRoot, 'app', 'api', 'watchtower', 'review', 'route.ts'))).toBe(true)
    expect(existsSync(join(repoRoot, 'app', 'api', 'rag', 'p1-evidence', 'route.ts'))).toBe(true)

    const legacyReadme = readFileSync(join(repoRoot, 'api', 'README.md'), 'utf8')
    expect(legacyReadme).toContain('legacy Vite')
    expect(legacyReadme).toContain('app/api/**')
  })
})
