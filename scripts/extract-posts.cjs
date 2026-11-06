const fs = require('fs');
const path = require('path');

const distDir = 'c:\\AI\\blog-dist';
const postsDir = path.join(distDir, 'posts');

const postFolders = fs.readdirSync(postsDir, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name);

console.log('Total post folders found:', postFolders.length);

// Extract excerpts and cards from pagination pages
const excerptsBySlug = new Map();
const pages = ['', ...Array.from({length: 22}, (_, i) => String(i + 2))];

for (const p of pages) {
  const filePath = p === '' ? path.join(distDir, 'index.html') : path.join(distDir, p, 'index.html');
  if (!fs.existsSync(filePath)) continue;
  const html = fs.readFileSync(filePath, 'utf8');
  
  const articleRegex = /<article class="post-card"[\s\S]*?<\/article>/g;
  let match;
  while ((match = articleRegex.exec(html)) !== null) {
    const cardHtml = match[0];
    const slugMatch = cardHtml.match(/<a href="\/posts\/([^"]+)"/);
    const excerptMatch = cardHtml.match(/<div class="excerpt"[^>]*>([\s\S]*?)<\/div>/);
    if (slugMatch && excerptMatch) {
      excerptsBySlug.set(slugMatch[1], excerptMatch[1].trim());
    }
  }
}

console.log('Excerpts mapped from pagination:', excerptsBySlug.size);

const posts = [];
let idCounter = 1000;

for (const slug of postFolders) {
  const htmlPath = path.join(postsDir, slug, 'index.html');
  if (!fs.existsSync(htmlPath)) continue;
  const html = fs.readFileSync(htmlPath, 'utf8');

  // Title
  let title = slug;
  const headerMatch = html.match(/<header class="post-header"[^>]*>[\s\S]*?<h1[^>]*>([\s\S]*?)<\/h1>/);
  if (headerMatch) {
    title = headerMatch[1].trim();
  }

  // Date
  let date = new Date().toISOString();
  const timeMatch = html.match(/<time datetime="([^"]+)"/);
  if (timeMatch) {
    date = timeMatch[1];
  }

  // Hero image
  let featuredImageUrl = null;
  let featuredImageAlt = null;
  const heroMatch = html.match(/<img[^>]+class="hero-image"[^>]*>/) || html.match(/<img[^>]*class="hero-image"[^>]*>/);
  if (heroMatch) {
    const imgTag = heroMatch[0];
    const srcMatch = imgTag.match(/src="([^"]+)"/);
    const altMatch = imgTag.match(/alt="([^"]*)"/);
    if (srcMatch) featuredImageUrl = srcMatch[1];
    if (altMatch) featuredImageAlt = altMatch[1];
  }

  // Content
  let content = '';
  const contentMatch = html.match(/<div class="content"[^>]*>([\s\S]*?)<\/div>\s*(?:<section class="related-section"|<nav class="back-nav")/);
  if (contentMatch) {
    content = contentMatch[1].trim();
  } else {
    const fallbackContentMatch = html.match(/<div class="content"[^>]*>([\s\S]*?)<\/div>/);
    if (fallbackContentMatch) {
      content = fallbackContentMatch[1].trim();
    }
  }

  // Excerpt
  let excerpt = excerptsBySlug.get(slug) || '';
  if (!excerpt) {
    // Generate simple excerpt from content
    const plainText = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    excerpt = plainText.length > 150 ? plainText.slice(0, 150) + '...' : plainText;
  }

  idCounter++;
  posts.push({
    id: idCounter,
    date: date,
    slug: slug,
    categories: [],
    tags: [],
    title: { rendered: title },
    excerpt: { rendered: excerpt },
    content: { rendered: content },
    featured_image_url: featuredImageUrl,
    featured_image_alt: featuredImageAlt
  });
}

// Sort posts by date descending
posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

console.log('Successfully extracted posts:', posts.length);

const outPath1 = path.join('c:\\AI\\blog', 'src', 'data', 'posts.json');
const outPath2 = path.join('c:\\AI\\blog', 'public', 'posts-feed.json');

fs.mkdirSync(path.dirname(outPath1), { recursive: true });
fs.writeFileSync(outPath1, JSON.stringify(posts, null, 2), 'utf8');
fs.writeFileSync(outPath2, JSON.stringify(posts, null, 2), 'utf8');

console.log('Saved to:', outPath1);
console.log('Saved to:', outPath2);
