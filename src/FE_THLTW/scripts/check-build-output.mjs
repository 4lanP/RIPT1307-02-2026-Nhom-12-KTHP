import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const oversizePattern = /Some chunks are larger than \d+ kB after minification/i

export const analyzeBuildOutput = (output) => {
  const hasOversizedChunkWarning = oversizePattern.test(output)
  return {
    passed: !hasOversizedChunkWarning,
    hasOversizedChunkWarning,
    message: hasOversizedChunkWarning
      ? 'Production build emitted oversized initial bundle warnings.'
      : 'Production build output passed bundle warning checks.',
  }
}

const runBuild = () => new Promise((resolve, reject) => {
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
  const child = spawn(npmCommand, ['run', 'build'], {
    cwd: process.cwd(),
    shell: process.platform === 'win32',
  })

  let output = ''
  child.stdout.on('data', (chunk) => {
    const text = chunk.toString()
    output += text
    process.stdout.write(text)
  })
  child.stderr.on('data', (chunk) => {
    const text = chunk.toString()
    output += text
    process.stderr.write(text)
  })
  child.on('error', reject)
  child.on('close', (code) => {
    if (code !== 0) {
      reject(new Error(`Production build failed with exit code ${code}`))
      return
    }
    resolve(output)
  })
})

export const runBundleCheck = async () => {
  const output = await runBuild()
  const result = analyzeBuildOutput(output)
  if (!result.passed) {
    throw new Error(result.message)
  }
  console.log(result.message)
}

const isCli = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]

if (isCli) {
  runBundleCheck().catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
}
