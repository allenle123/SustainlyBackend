const esbuild = require('esbuild');

esbuild.build({
  entryPoints: ['src/lambda/index.ts'],
  bundle: true,
  platform: 'node',
  target: ['node18'],
  outfile: 'dist/lambda/index.js',
  minify: true,
  sourcemap: true,
  external: [
    // Add any external dependencies that should not be bundled
    'aws-sdk',
    'aws-lambda'
  ]
}).catch(() => process.exit(1));
