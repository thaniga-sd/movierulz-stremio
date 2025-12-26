const { addonBuilder } = require("stremio-addon-sdk");
const axios = require("axios");
const cheerio = require("cheerio");

const manifest = {
    id: "com.movierulz.tamil.vercel",
    version: "1.6.0",
    name: "MovieRulz Tamil Featured",
    description: "Browse and Search MovieRulz movies",
    resources: ["catalog"],
    types: ["movie"],
    idPrefixes: ["mr"],
    catalogs: [{ 
        type: "movie", 
        id: "mr-tamil", 
        name: "Tamil Featured (MovieRulz)",
        extra: [{ name: "search", isRequired: false }] 
    }]
};

const builder = new addonBuilder(manifest);

// The Catalog Handler
builder.defineCatalogHandler(async ({ type, id, extra }) => {
    let targetUrl = "https://www.5movierulz.hockey/category/tamil-featured";
    
    // If user types in the search bar
    if (extra && extra.search) {
        targetUrl = `https://www.5movierulz.hockey/?s=${encodeURIComponent(extra.search)}`;
    }

    try {
        const { data } = await axios.get(targetUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 5000 
        });

        const $ = cheerio.load(data);
        const metas = [];

        $("article, .post-article").each((i, el) => {
            const title = $(el).find(".entry-title a, h2 a").first().text().trim();
            const poster = $(el).find("img").attr("src");
            
            if (title && i < 20) {
                metas.push({
                    id: `mr:${title.replace(/[^a-zA-Z0-9]/g, '')}`, // Unique ID based on title
                    type: "movie",
                    name: title,
                    poster: poster,
                    description: `Source: MovieRulz - ${title}`
                });
            }
        });
        return { metas };
    } catch (e) {
        return { metas: [] };
    }
});

const addonInterface = builder.getInterface();

// Vercel Serverless Function Logic
module.exports = async (req, res) => {
    // Enable CORS for Stremio
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const url = req.url;

    // Route to Manifest
    if (url.endsWith('manifest.json') || url === '/' || url === '') {
        return res.send(addonInterface.manifest);
    }

    // Route to Catalog
    if (url.includes('/catalog/')) {
        // Extract search query if present
        const searchMatch = url.match(/search=([^/.]+)/);
        const query = searchMatch ? decodeURIComponent(searchMatch[1]) : null;
        
        const catalog = await addonInterface.get('catalog', 'movie', 'mr-tamil', { search: query });
        return res.send(catalog);
    }
