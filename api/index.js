const { addonBuilder } = require("stremio-addon-sdk");
const axios = require("axios");
const cheerio = require("cheerio");

const manifest = {
    id: "com.movierulz.tamil.vercel",
    version: "1.6.1",
    name: "MovieRulz Tamil",
    description: "Browse MovieRulz movies",
    resources: ["catalog"],
    types: ["movie"],
    idPrefixes: ["mr"],
    catalogs: [{ 
        type: "movie", 
        id: "mr-tamil", 
        name: "Tamil Featured",
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
        const response = await axios.get(targetUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 5000 
        });
        const $ = cheerio.load(response.data);
        const metas = [];
        $("article, .post-article").each((i, el) => {
            const title = $(el).find(".entry-title a, h2 a").first().text().trim();
            const poster = $(el).find("img").attr("src");
            if (title && i < 20) {
                metas.push({
                    id: `mr:${title.replace(/[^a-zA-Z0-9]/g, '')}`,
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
    try {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', 'application/json');

        const url = req.url || '';

        if (url.includes('manifest.json') || url === '/' || url === '') {
            return res.status(200).json(manifest);
        }

        if (url.includes('/catalog/')) {
            const searchMatch = url.match(/search=([^/.]+)/);
            const query = searchMatch ? decodeURIComponent(searchMatch[1]) : null;
            const catalog = await addonInterface.get('catalog', 'movie', 'mr-tamil', { search: query });
            return res.status(200).json(catalog);
        }

        return res.status(404).json({ error: "Not found" });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Internal Error", details: err.message });
    }
};
