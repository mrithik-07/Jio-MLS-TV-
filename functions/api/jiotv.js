export async function onRequest(context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=300'
  };

  try {
    const response = await fetch('https://www.jiotv.com/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-IN,en;q=0.9'
      }
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ error: `JioTV blocked: ${response.status}` }), {
        status: response.status,
        headers
      });
    }

    const html = await response.text();
    const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);

    if (!match || !match[1]) {
      return new Response(JSON.stringify({ error: '__NEXT_DATA__ nahi mila' }), {
        status: 500,
        headers
      });
    }

    const nextData = JSON.parse(match[1]);
    const pageData = nextData.props.pageProps.pageData;

    const cleanData = {
      events: (pageData.promotionalData || []).map(item => ({
        title: item.showName || item.title,
        channel: item.channel_name || item.provider,
        channel_id: item.channel_id,
        url: "https://www.jiotv.com" + item.url,
        poster: item.imagePath
      })),
      categories: (pageData.featuredNewData || []).map(cat => ({
        category_name: cat.name,
        items: (cat.data || []).map(item => ({
          title: item.showName || item.title,
          channel: item.channel_name || item.provider || "VOD",
          channel_id: item.channel_id || item.contentId,
          url: "https://www.jiotv.com" + item.url,
          poster: item.imagePath,
          logo: item.logoPath || ""
        }))
      }))
    };

    return new Response(JSON.stringify(cleanData), { status: 200, headers });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });
  }
}
