export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://ignite.education');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  res.json({
    country: req.headers['x-vercel-ip-country'] || null,
    region: req.headers['x-vercel-ip-country-region'] || null,
  });
}
