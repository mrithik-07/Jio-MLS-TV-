export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');

  try {
    // JioTV ki direct public channel list API
    const response = await fetch('https://jiotvapi.cdn.jio.com/apis/v3.0/getMobileChannelList/get/?langId=6&os=android&devicetype=phone&usertype=tv&version=315', {
      headers: {
        'User-Agent': 'okhttp/4.9.3',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `API Blocked: ${response.status}` });
    }

    const data = await response.json();
    const channels = (data.result || []).map(ch => ({
      channel_id: ch.channel_id,
      title: ch.channel_name,
      category: ch.channelCategoryId,
      logo: `https://jiotvimages.cdn.jio.com/dare_images/images/${ch.logoUrl}`,
      url: `https://www.jiotv.com/live-channel/${ch.channel_name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}/${ch.channel_id}`
    }));

    return res.status(200).json({ total: channels.length, channels });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
