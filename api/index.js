const { addonBuilder } = require("stremio-addon-sdk");
const axios = require("axios");
const cheerio = require("cheerio");

const manifest = {
    id: "com.movierulz.tamil.vercel",
    version: "1.3.0",
    name: "MovieRulz Tamil Featured",
    description: "Search and Browse Tamil movies (Advanced Scraper)",
    resources: ["catalog"],
    types: ["movie"],
    idPrefixes: ["tt"],
    catalogs: [{ 
        type: "movie", 
        id: "mr-tamil", 
        name: "Tamil Featured (MovieRulz)",
        extra: [{ name: "search", isRequired: false }]
    }]
};

const builder = new addonBuilder(manifest);

builder.defineCatalogHandler(async ({ type, id, extra }) => {
    // We try the most stable URL for MovieRulz
    let targetUrl = "https://www.5movierulz.hockey/category/tamil-featured";
    if (extra && extra.search) {
        targetUrl = `https://www.5movierulz.hockey/?s=${encodeURIComponent(extra.search)}`;
    }

    try {
        const response = await axios.get(targetUrl, {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': 'https://www.google.com/'
            },
            timeout: 8000
        });

        const $ = cheerio.load(response.data);
        const metas = [];

        // This selector is very broad to catch any version of the site
        $("li, article, .post-article, .item").each((i, el) => {
            const link = $(el).find("a").first();
            const title = link.text().trim() || $(el).find("img").attr("alt");
            let poster = $(el).find("img").attr("src");

            // Filter out junk results (like "Home" or "Contact")
            if (title && title.length > 3 && poster && !title.includes("Home")) {
                metas.push({
                    id: `mr_${Math.random().toString(36).substr(2, 9)}`,
                    type: "movie",
                    name: title,
                    poster: poster
                });
            }
        });

        return { metas: metas.slice(0, 40) }; // Return up to 40 movies
    } catch (e) {
        console.error("Scraper Error:", e.message);
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

    if (url.includes('/catalog/')) {
        // This regex helps extract the search term even if the URL is messy
        const searchMatch = url.match(/search=([^/.]+)/);
        const query = searchMatch ? decodeURIComponent(searchMatch[1]) : null;
        
        const catalog = await addonInterface.get('catalog', 'movie', 'mr-tamil', { search: query });
        return res.json(catalog);
    }

    res.status(404).json({ error: "Not found" });
};
