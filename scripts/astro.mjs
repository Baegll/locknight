process.env.ASTRO_TELEMETRY_DISABLED='1';
await import(new URL('../node_modules/astro/bin/astro.mjs',import.meta.url));
