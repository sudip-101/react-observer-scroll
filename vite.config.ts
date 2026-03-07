import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig(async ({ mode }) => {
  if (mode === 'lib') {
    const dts = (await import('vite-plugin-dts')).default;
    return {
      plugins: [
        react(),
        dts({ include: ['lib'], exclude: ['tests', 'src'] }),
      ],
      build: {
        lib: {
          entry: resolve(__dirname, 'lib/index.ts'),
          name: 'ReactObserverScroll',
          fileName: 'react-observer-scroll',
          formats: ['es', 'umd'],
        },
        rollupOptions: {
          external: ['react', 'react-dom', 'react/jsx-runtime'],
          output: {
            globals: {
              react: 'React',
              'react-dom': 'ReactDOM',
              'react/jsx-runtime': 'jsxRuntime',
            },
          },
        },
      },
    };
  }

  // Default: demo app dev/build
  const tailwindcss = (await import('@tailwindcss/vite')).default;
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@lib': resolve(__dirname, 'lib'),
      },
    },
    build: {
      outDir: 'dist-demo',
    },
  };
});
