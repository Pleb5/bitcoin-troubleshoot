import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://kit.svelte.dev/docs/integrations#preprocessors
	// for more information about preprocessors
    // This is needed for vite to handle Typescript in svelte components
	preprocess: vitePreprocess(),

	kit: {
        adapter: adapter(
            // ---------------- For build ------------------
            {
            // This is the default option but its nice to spell out
            pages: 'build',
            assets: 'build',
            // For SPA this is important. If a dynamic route is requested on a static site,
            // a fallback page is the response which svelte recognizes on the client-side
            // and tries to do client-side dynamic routing. Hosting provider specific option.
            fallback: '404.html',
            precompress: false,
            // strict is needed to check if all sites have prerender = true OR have a fallback page(see above)
            strict: true
            }
        )
    }
};

export default config;
