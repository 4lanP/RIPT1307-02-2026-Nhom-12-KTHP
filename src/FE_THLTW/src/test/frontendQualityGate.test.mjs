import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { analyzeBuildOutput } from '../../scripts/check-build-output.mjs'
import {
  assertSafeErrorEnvelope,
  assertSuccessEnvelope,
  errorEnvelope,
  successEnvelope,
} from './frontendQualityTestUtils.mjs'

const currentDir = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(currentDir, '../..')
const packageSource = readFileSync(resolve(rootDir, 'package.json'), 'utf8')
const appSource = readFileSync(resolve(rootDir, 'src/App.tsx'), 'utf8')
const viteSource = readFileSync(resolve(rootDir, 'vite.config.js'), 'utf8')
const eslintSource = readFileSync(resolve(rootDir, 'eslint.config.js'), 'utf8')

const packageJson = JSON.parse(packageSource)

assert.equal(packageJson.scripts.lint, 'eslint .')
assert.match(packageJson.scripts.test, /src\/test\/frontendQualityGate\.test\.mjs/)
assert.equal(packageJson.scripts['bundle:check'], 'node scripts/check-build-output.mjs')
assert.equal(packageJson.scripts.quality, 'npm run lint && npm test && npm run bundle:check')

assert.match(eslintSource, /node_modules/)
assert.match(eslintSource, /dist/)
assert.match(eslintSource, /no-debugger/)

assert.equal(analyzeBuildOutput('✓ built in 2.00s').passed, true)
assert.equal(
  analyzeBuildOutput('(!) Some chunks are larger than 500 kB after minification.').passed,
  false
)

assertSuccessEnvelope(successEnvelope({ status: 'sent' }))
assertSafeErrorEnvelope(errorEnvelope('EXTERNAL_SERVICE_ERROR', 'provider-timeout'))

assert.match(appSource, /React\.lazy/)
assert.match(appSource, /Suspense/)
assert.match(appSource, /import\('\.\/pages\/admin\/AdminEmailSendPage'\)/)
assert.match(viteSource, /manualChunks/)
assert.match(viteSource, /react-vendor/)
assert.doesNotMatch(viteSource, /antd-vendor/)
assert.match(viteSource, /return undefined/)
