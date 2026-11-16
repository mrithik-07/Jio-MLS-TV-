export async function onRequest(context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=120'
  };

  // JSON ke andar kisi bhi level par key dhundhne ka function
  function findKeyDeep(obj, targetKey) {
    if (!obj || typeof obj !== 'object') return null;
    if (Object.prototype.hasOwnProperty.call(obj, targetKey) && Array.isArray(obj[targetKey])) {
      return obj[targetKey];
    }
    for (const k of Object.keys(obj)) {
      const found = findKeyDeep(obj[k], targetKey);
      if (found) return found;
    }
    return null;
  }

  try {
    // Desktop User-Agent ke saath fetch karein taaki full SSR data aaye
    const response = await fetch('https://www.jiotv.com/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-IN,en-GB;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache'
      }
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ error: `JioTV HTTP Error: ${response.status}` }), {
        status: response.status,
        headers
      });
    }

    const html = await response.text();
    const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);

    if (!match || !match[1]) {
      return new Response(JSON.stringify({ error: '__NEXT_DATA__ script tag nahi mila' }), {
        status: 500,
        headers
      });
    }

    const nextData = JSON.parse(match[1]);

    // Deep search se promotionalData aur featuredNewData nikalna
    const promoList = findKeyDeep(nextData, 'promotionalData') || [];
    const featuredList = findKeyDeep(nextData, 'featuredNewData') || [];

    if (!promoList.length && !featuredList.length) {
      return new Response(JSON.stringify({
        error: 'JioTV ne empty data bheja (Geo/Bot restriction)',
        debug_keys: Object.keys(nextData?.props?.pageProps || {})
      }), {
        status: 502,
        headers
      });
    }

    const cleanData = {
      events: promoList.map(item => ({
        title: item.showName || item.showname || item.title || item.channel_name || 'Live Event',
        channel: item.channel_name || item.provider || 'JioTV',
        channel_id: item.channel_id || item.contentId || '',
        url: "https://www.jiotv.com" + (item.url || ''),
        poster: item.imagePath || ''
      })),
      categories: featuredList.map(cat => ({
        category_name: cat.name || 'Channels',
        items: (cat.data || []).map(item => ({
          title: item.showName || item.showname || item.title || item.channel_name || 'Live Show',
          channel: item.channel_name || item.provider || 'VOD',
          channel_id: item.channel_id || item.contentId || '',
          url: "https://www.jiotv.com" + (item.url || ''),
          poster: item.imagePath || '',
          logo: item.logoPath || ''
        }))
      }))
    };

    return new Response(JSON.stringify(cleanData), { status: 200, headers });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });
  }
}
