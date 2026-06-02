import { posts, site } from '../data/site';

export const GET = () => {
  const items = posts
    .map((post) => {
      const url = `${site.url}/blog/${post.slug}`;
      return `<item><title><![CDATA[${post.title}]]></title><link>${url}</link><guid>${url}</guid><pubDate>${new Date(post.date).toUTCString()}</pubDate><description><![CDATA[${post.description}]]></description></item>`;
    })
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${site.name} Blog</title><link>${site.url}</link><description>${site.description}</description>${items}</channel></rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
    },
  });
};
