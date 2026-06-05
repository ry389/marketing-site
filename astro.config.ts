import path from 'path';
import { copyFile, readFile, writeFile } from 'fs/promises';
import { fileURLToPath } from 'url';

import { defineConfig } from 'astro/config';

import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';
import partytown from '@astrojs/partytown';
import icon from 'astro-icon';
import compress from 'astro-compress';
import tailwindcss from '@tailwindcss/vite';
import type { AstroIntegration } from 'astro';

import astrowind from './vendor/integration';

import { readingTimeRemarkPlugin, responsiveTablesRehypePlugin, lazyImagesRehypePlugin } from './src/utils/frontmatter';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const hasExternalScripts = false;
const whenExternalScripts = (items: (() => AstroIntegration) | (() => AstroIntegration)[] = []) =>
  hasExternalScripts ? (Array.isArray(items) ? items.map((item) => item()) : [items()]) : [];

const sitemapAlias = (): AstroIntegration => ({
  name: 'citedstories-sitemap-alias',
  hooks: {
    'astro:build:done': async ({ dir }) => {
      const sitemapIndex = new URL('sitemap-index.xml', dir);
      const sitemapAliasFile = new URL('sitemap.xml', dir);
      const robotsFile = new URL('robots.txt', dir);

      await copyFile(sitemapIndex, sitemapAliasFile);

      const robotsTxt = await readFile(robotsFile, 'utf8');
      const sitemapLine = 'Sitemap: https://citedstories.com/sitemap.xml';
      const nextRobotsTxt = robotsTxt.match(/^Sitemap: .+$/m)
        ? robotsTxt.replace(/^Sitemap: .+$/m, sitemapLine)
        : `${robotsTxt.trimEnd()}\n\n${sitemapLine}`;

      await writeFile(robotsFile, nextRobotsTxt, 'utf8');
    },
  },
});

export default defineConfig({
  output: 'static',

  integrations: [
    sitemap(),
    mdx(),
    icon({
      include: {
        tabler: ['*'],
        'flat-color-icons': [
          'template',
          'gallery',
          'approval',
          'document',
          'advertising',
          'currency-exchange',
          'voice-presentation',
          'business-contact',
          'database',
        ],
      },
    }),

    ...whenExternalScripts(() =>
      partytown({
        config: { forward: ['dataLayer.push'] },
      })
    ),

    compress({
      CSS: true,
      HTML: {
        'html-minifier-terser': {
          removeAttributeQuotes: false,
        },
      },
      Image: false,
      JavaScript: true,
      SVG: false,
      Logger: 1,
    }),

    astrowind({
      config: './src/config.yaml',
    }),

    sitemapAlias(),
  ],

  image: {
    domains: ['cdn.pixabay.com', 'images.unsplash.com', 'plus.unsplash.com', 'placehold.co'],
  },

  markdown: {
    remarkPlugins: [readingTimeRemarkPlugin],
    rehypePlugins: [responsiveTablesRehypePlugin, lazyImagesRehypePlugin],
  },

  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '~': path.resolve(__dirname, './src'),
      },
    },
  },
});
