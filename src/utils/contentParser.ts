export function parseContent(content: string) {
  const mentions = [...content.matchAll(/@([a-zA-Z0-9_]+)/g)].map((m) => m[1]);
  const hashtags = [...content.matchAll(/#([a-zA-Z0-9_]+)/g)].map((m) => m[1]);
  const links = [...content.matchAll(/https?:\/\/[^\s]+/g)].map((m) => m[0]);
  return { mentions, hashtags, links };
}

export function renderContentHtml(content: string): string {
  let html = content
    .replace(/@([a-zA-Z0-9_]+)/g, '<a href="/agents/$1">@$1</a>')
    .replace(/#([a-zA-Z0-9_]+)/g, '<a href="/tags/$1">#$1</a>')
    .replace(/https?:\/\/[^\s]+/g, '<a href="$&" rel="nofollow">$&</a>');
  html = html.replace(/\n/g, '<br>');
  return html;
}
