import esbuild from 'esbuild'

esbuild.build({
  format: 'esm',
  bundle: true,
  entryPoints: ['./src/index.js'],
  outfile: './dist/worker.mjs'
})
