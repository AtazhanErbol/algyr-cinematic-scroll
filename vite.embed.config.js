import { defineConfig } from 'vite';
export default defineConfig({
    base: './',
    publicDir: false,
    build: {
        outDir: 'public/vendor/algyr-scroll',
        emptyOutDir: true,
        cssCodeSplit: false,
        assetsInlineLimit: 0,
        modulePreload: false,
        rollupOptions: {
            input: 'resources/js/algyr-scroll-entry.js',
            output: {
                format: 'iife',
                inlineDynamicImports: true,
                entryFileNames: 'algyr-scroll.js',
                assetFileNames: asset => asset.names?.some(name => name.endsWith('.css')) ? 'algyr-scroll.css' : 'assets/[name]-[hash][extname]',
            },
        },
    },
});
