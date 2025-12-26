const { addonBuilder } = require("stremio-addon-sdk");
const axios = require("axios");
const cheerio = require("cheerio");

const manifest = {
    id: "com.movierulz.tamil.vercel",
    version: "1.5.0",
    name: "MovieRulz Tamil Featured",
    description: "Connects MovieRulz to MediaFusion Streams",
    resources: ["catalog"],
    types: ["movie"],
    idPrefixes: ["tt"], // This tells Stremio to look for IMDb providers like MediaFusion
    catalogs: [{ 
        type: "movie", 
        id: "mr-tamil", 
        name: "Tamil Featured (MovieRulz)",
        extra: [{ name: "search", isRequired: false }]
    }]
};

const builder = new addonBuilder(manifest);

builder.defineCatalogHandler(async ({ type, id, extra }) => {
    let targetUrl = "https://www.5movierulz.hockey/category/tamil-featured";
    if (extra && extra.search) {
        targetUrl = `https://www.5movierulz.hockey/?s=${encodeURIComponent(extra.search)}`;
    }

    try {
        const { data } = await axios.get(targetUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const $ = cheerio.load(data);
        const metas = [];

        // We use a promise array to scrape IMDb IDs for each movie quickly
        const items = $("article, .post-article").toArray();
        
        for (const el of items) {
            const title = $(el).find(".entry-title a, h2 a").first().text().trim();
            const poster = $(el).find("img").attr("src");
            const moviePageLink = $(el).find("a").attr("href");

            if (title && moviePageLink) {
                try {
                    // 1. Visit the specific movie page to find the IMDb link
                    const pageRes = await axios.get(moviePageLink, { timeout: 3000 });
                    const $page = cheerio.load(pageRes.data);
                    
                    // 2. Look for the IMDb ID (usually in a link like imdb.com/title/tt12345)
                    const imdbLink = $page('a[href*="imdb.com/title/"]').attr('href');
                    const imdbId = imdbLink ? imdbLink.match(/tt\d+/)[0] : null;

                    if (imdbId) {
                        metas.push({
                            id: imdbId, // Using the REAL IMDb ID!
                            type: "movie",
                            name: title,
                            poster: poster
                        });
                    }
                } catch (err) {
                    // If we can't find an IMDb ID, we skip it so we don't get "No streams"
                    continue; 
                }
            }
        }
        return { metas };
    } catch (e) {
        return { metas: [] };
    }
});

const addonInterface = builder.getInterface();
module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    if (req.url.includes('manifest.json') || req.url === '/') return res.json(addonInterface.manifest);
    if (req.url.includes('/catalog/')) {
        const catalog = await addonInterface.get('catalog', 'movie', 'mr-tamil');
        return res.json(catalog);
    }
    res.status(404).json({ error: "Not found" });
};
