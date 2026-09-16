import { defineConfig } from 'vite';

const CSP =
  "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; media-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'";

export default defineConfig({
  base: './',
  server: {
    host: true,
    allowedHosts: true,
  },
  plugins: [
    {
      name: 'production-csp',
      transformIndexHtml(html, ctx) {
        if (ctx.server) return html;
        return html.replace(
          '<meta name="viewport"',
          `<meta http-equiv="Content-Security-Policy" content="${CSP}">\n    <meta name="viewport"`,
        );
      },
    },
  ],
});
