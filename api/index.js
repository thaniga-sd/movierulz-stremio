const { addonBuilder } = require("stremio-addon-sdk");
const axios = require("axios");
const cheerio = require("cheerio");

const manifest = {
    id: "com.movierulz.tamil.vercel",
    version: "1.2.0",
    name: "MovieRulz Tamil Featured",
    description: "Search and Browse Tamil movies from MovieRulz",
    resources: ["catalog"],
    types: ["movie"],
    idPrefixes: ["tt"],
    catalogs: [{ 
        type: "movie", 
        id: "mr-tamil", 
        name: "Tamil Featured (MovieRulz)",
        extra: [{ name: "search", isRequired: false }] // This enables the search bar!
    }]
};

const builder = new addonBuilder(manifest);

builder.defineCatalogHandler(async ({ type, id, extra }) => {
    let searchUrl = "https://www.5movierulz.hockey/category/tamil-featured";
    
    // If user is searching, change the URL to the search page
    if (extra && extra.search) {
        searchUrl = `https://www.5movierulz.hockey/?s=${encodeURIComponent(extra.search)}`;
    }

    try {
        const { data } = await axios.get(searchUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        const $ = cheerio.load(data);
        const metas = [];

        $("article, .post-article").each((i, el) => {
            const title = $(el).find(".entry-title a, h2 a").first().text().trim();
            const poster = $(el).find("img").attr("src");
            if (title) {
                metas.push({
                    id: `mr_search_${i}`, 
                    type: "movie",
                    name: title,
                    poster: poster
                });
            }
        });
        return { metas };
    } catch (e) {
        return { metas: [] };
    }
});

const addonInterface = builder.getInterface();

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    
    const url = req.url;

    if (url.includes('manifest.json') || url === '/' || url === '') {
        return res.json(addonInterface.manifest);
    }

    // This part handles both the "Tamil Featured" list AND Search results
    if (url.includes('/catalog/')) {
        const parts = url.split('/');
        const type = parts[parts.indexOf('catalog') + 1];
        const id = parts[parts.indexOf('catalog') + 2];
        
        // Check if there is a search query in the URL (e.g. search=vritta)
        let query = null;
        if (id.includes('search=')) {
            query = decodeURIComponent(id.split('search=')[1].replace('.json', ''));
        }

        const catalog = await addonInterface.get('catalog', 'movie', 'mr-tamil', { search: query });
        return res.json(catalog);
    }

    res.status(404).json({ error: "Not found", path: url });
};
