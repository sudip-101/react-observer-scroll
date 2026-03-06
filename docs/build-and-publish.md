## Overview

This document outlines the architecture, tooling, and build process for **react-observer-scroll**. The library is built using Vite in Library Mode, allowing for a co-located demo environment.

## The "Why" (Description Strategy)

To ensure developers understand the value proposition immediately, all package metadata and documentation will revolve around this core description:

> "Production-grade infinite and bidirectional scroll components powered by the IntersectionObserver API. Eliminates layout thrashing, main-thread blocking, and performance bottlenecks caused by traditional, heavy scroll event listeners."

## 1\. Project Structure (The Vite Way)

By organizing the folder structure this way, npm run dev will boot up your demo site using index.html, while npm run build will compile only the src/lib folder into your npm package.

Plaintext

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`  react-observer-scroll/  ├── src/  │   ├── lib/                        # THE NPM PACKAGE  │   │   ├── index.ts                # Public exports  │   │   ├── InfiniteScroll.tsx        │   │   ├── BidirectionalScroll.tsx   │   │   └── hooks/                    │   ├── DemoApp.tsx                 # THE DEMO SITE  │   └── main.tsx                    # Mounts DemoApp to the DOM  ├── index.html                      # Entry point for the Vite dev server  ├── package.json  ├── tsconfig.json  └── vite.config.ts                  # Configured for Library Mode  `

## 2\. Crucial package.json Configuration

This config ensures your entry points are correct for npm, sets up your peer dependencies safely, and includes the scripts for both the library and the demo.

JSON

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`  {    "name": "react-observer-scroll",    "version": "1.0.0",    "description": "Production-grade infinite and bidirectional scroll components powered by the IntersectionObserver API. Eliminates layout thrashing and performance bottlenecks caused by traditional, heavy scroll event listeners.",    "type": "module",    "main": "./dist/react-observer-scroll.umd.cjs",    "module": "./dist/react-observer-scroll.js",    "types": "./dist/index.d.ts",    "exports": {      ".": {        "import": "./dist/react-observer-scroll.js",        "require": "./dist/react-observer-scroll.umd.cjs",        "types": "./dist/index.d.ts"      }    },    "files": [      "dist"    ],    "peerDependencies": {      "react": ">=16.8.0",      "react-dom": ">=16.8.0"    },    "devDependencies": {      "@types/react": "^18.2.0",      "@types/react-dom": "^18.2.0",      "@vitejs/plugin-react": "^4.2.0",      "react": "^18.2.0",      "react-dom": "^18.2.0",      "typescript": "^5.0.0",      "vite": "^5.0.0",      "vite-plugin-dts": "^3.0.0"    },    "scripts": {      "dev": "vite",      "build": "tsc && vite build",      "preview": "vite preview"    }  }  `

## 3\. The Bundler: vite.config.ts

Vite uses Rollup under the hood. To build a library, you must explicitly enable build.lib and configure vite-plugin-dts (otherwise, Vite will not generate the .d.ts TypeScript files that consumers rely on for auto-complete).

TypeScript

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`  import { defineConfig } from 'vite';  import react from '@vitejs/plugin-react';  import dts from 'vite-plugin-dts';  import { resolve } from 'path';  export default defineConfig({    plugins: [      react(),      // Generates TypeScript declaration files (.d.ts)      dts({ include: ['src/lib'] })     ],    build: {      // Enable Library Mode      lib: {        entry: resolve(__dirname, 'src/lib/index.ts'),        name: 'ReactObserverScroll',        fileName: 'react-observer-scroll',        formats: ['es', 'umd']      },      rollupOptions: {        // Ensure React is NOT bundled into your library        external: ['react', 'react-dom', 'react/jsx-runtime'],        output: {          globals: {            react: 'React',            'react-dom': 'ReactDOM',            'react/jsx-runtime': 'jsxRuntime'          }        }      }    }  });  `

## 4\. Workflows & Publishing

Because you have a demo app in the same repo, your GitHub Actions should handle two things:

1.  **Publishing the Package:** When you tag a release, build the src/lib folder and publish to npm.
2.  **Deploying the Demo:** You can add a separate Vite config (e.g., vite.demo.config.ts) to build the demo site and deploy it to GitHub Pages or Vercel so users have a live interactive playground.

With this setup, you get the best of both worlds: a world-class developer experience using Vite for your demo, and a highly optimized, tree-shakeable npm package for your users.
