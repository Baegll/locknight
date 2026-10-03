import { defineConfig } from 'astro/config';
export default defineConfig({site:'https://baegll.github.io', trailingSlash:'always', build:{format:'directory'},devToolbar:{enabled:false},vite:{cacheDir:'.cache/vite'}});
