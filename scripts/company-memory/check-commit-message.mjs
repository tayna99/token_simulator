#!/usr/bin/env node
import { readFileSync } from 'node:fs'

import { validateCommitMessage } from './core.mjs'

const commitMessagePath = process.argv[2]

if (!commitMessagePath) {
  console.error('Usage: node scripts/company-memory/check-commit-message.mjs <commit-msg-file>')
  process.exit(2)
}

const message = readFileSync(commitMessagePath, 'utf8')
const result = validateCommitMessage(message)

for (const warning of result.warnings) {
  console.warn(`company-memory warning: ${warning}`)
}

if (!result.ok) {
  console.error('company-memory commit message check failed:')
  for (const error of result.errors) {
    console.error(`- ${error}`)
  }
  process.exit(1)
}
