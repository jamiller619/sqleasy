import * as esbuild from 'esbuild'
import fs from 'node:fs/promises'
import dts from 'npm-dts'

await fs.rm('dist', {
  recursive: true,
  force: true,
})

await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: ['node23.6.0'],
  packages: 'external',
  outfile: 'dist/index.js',
})

const generator = new dts.Generator({
  entry: 'src/index.ts',
  output: 'dist/index.d.ts',
})

await generator.generate()
