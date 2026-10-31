const WP_API_BASE = import.meta.env.WP_API_URL || 'https://samsuiri.qd.je/wp-json/wp/v2';

export interface Post {
  id: number;
  date: string;
  slug: string;
  title: { rendered: string };
  excerpt: { rendered: string };
  content: { rendered: string };
  _embedded?: {
    'wp:featuredmedia'?: Array<{ source_url: string; alt_text?: string }>;
  };
}

export async function getPosts(): Promise<Post[]> {
  try {
    const res = await fetch(`${WP_API_BASE}/posts?_embed&per_page=20`);
    if (!res.ok) {
      console.warn(`Error fetching posts: ${res.status}`);
      return [];
    }
    return await res.json();
  } catch (error) {
    console.error('Fetch error from WordPress API:', error);
    return [];
  }
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  try {
    const res = await fetch(`${WP_API_BASE}/posts?slug=${slug}&_embed`);
    if (!res.ok) return null;
    const posts: Post[] = await res.json();
    return posts.length > 0 ? posts[0] : null;
  } catch (error) {
    console.error(`Error fetching post ${slug}:`, error);
    return null;
  }
}
