const WP_API_BASE = import.meta.env.WP_API_URL || 'https://samsuiri.qd.je/wp-json/wp/v2';
const STATIC_FEED_URL = import.meta.env.POSTS_FEED_URL || 'https://samsuiri.qd.je/wp-content/posts-feed.json';

export interface Post {
  id: number;
  date: string;
  slug: string;
  categories: number[];
  tags: number[];
  title: { rendered: string };
  excerpt: { rendered: string };
  content: { rendered: string };
  _embedded?: {
    'wp:featuredmedia'?: Array<{ source_url: string; alt_text?: string }>;
    'wp:term'?: Array<Array<{ id: number; name: string; slug: string }>>;
  };
}

export async function getAllPosts(): Promise<Post[]> {
  // 1. Intento primario de ultra-alta velocidad: Feed estático optimizado (274 entradas en 1 request)
  try {
    const staticRes = await fetch(STATIC_FEED_URL);
    if (staticRes.ok) {
      const data: Post[] = await staticRes.json();
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    }
  } catch (err) {
    console.warn('[WP] Feed estático no disponible, usando fallback paginado REST API...');
  }

  // 2. Fallback resiliente paginado
  const allPosts: Post[] = [];
  let page = 1;
  const perPage = 25;

  while (page <= 15) {
    try {
      const res = await fetch(`${WP_API_BASE}/posts?_fields=id,slug,title,excerpt,content,date,categories,tags&per_page=${perPage}&page=${page}`);
      if (!res.ok) break;
      const posts: Post[] = await res.json();
      if (!posts || posts.length === 0) break;

      allPosts.push(...posts);

      const totalPages = Number(res.headers.get('X-WP-TotalPages')) || 1;
      if (page >= totalPages) break;
      page++;
    } catch (error) {
      console.error('Error fetching fallback posts:', error);
      break;
    }
  }

  return allPosts;
}

export function getRelatedPosts(currentPost: Post, allPosts: Post[], limit = 4): Post[] {
  return allPosts
    .filter((p) => p.id !== currentPost.id)
    .map((p) => {
      let score = 0;
      if (currentPost.categories && p.categories) {
        const commonCats = p.categories.filter((c) => currentPost.categories.includes(c));
        score += commonCats.length * 3;
      }
      if (currentPost.tags && p.tags) {
        const commonTags = p.tags.filter((t) => currentPost.tags.includes(t));
        score += commonTags.length * 2;
      }
      return { post: p, score };
    })
    .sort((a, b) => b.score - a.score || new Date(b.post.date).getTime() - new Date(a.post.date).getTime())
    .slice(0, limit)
    .map((item) => item.post);
}
