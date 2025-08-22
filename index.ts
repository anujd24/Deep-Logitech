import { createServer } from 'http';

interface Story {
  title: string;
  link: string;
}

class TimeStoriesExtractor {
  private readonly TIME_URL = 'https://time.com';

  async getLatestStories(): Promise<Story[]> {
    const response = await fetch(this.TIME_URL, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const html = await response.text();

    let stories = this.extractWithPattern(html);
    if (stories.length === 0) stories = this.extractFallback(html);


    return stories.slice(0, 6);
  }

  private extractWithPattern(html: string): Story[] {
    const stories: Story[] = [];
    const pattern = /<li[^>]*class="[^"]*latest-stories__item[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/li>/gi;
    let match;

    while ((match = pattern.exec(html)) !== null) {
      const link = match[1].startsWith('http') ? match[1] : `${this.TIME_URL}${match[1]}`;
      const title = match[2].replace(/<[^>]+>/g, '').trim();
      if (title.length > 5) stories.push({ title, link });
    }

    return stories;
  }

  private extractFallback(html: string): Story[] {
    const stories: Story[] = [];
    const linkPattern = /<a[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/gi;
    let match;

    while ((match = linkPattern.exec(html)) !== null) {
      const link = match[1];
      const title = match[2].replace(/<[^>]+>/g, '').trim();
      if (title.length > 15 && !link.includes('#')) {
        stories.push({ title, link: link.startsWith('http') ? link : `${this.TIME_URL}${link}` });
      }
    }

    return stories;
  }
}

const extractor = new TimeStoriesExtractor();

const server = createServer(async (req, res) => {

  res.setHeader('Access-Control-Allow-Origin', '*');

  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'GET' && req.url === '/') {
    try {
      const data = await extractor.getLatestStories();
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, count: data.length, data }, null, 2));
    } catch {
      res.writeHead(500);
      res.end(JSON.stringify({ success: false, error: 'Failed to fetch stories' }));
    }
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ success: false, error: 'Use GET /' }));
  }
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}/`));
