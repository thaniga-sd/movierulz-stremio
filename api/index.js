const { addonBuilder } = require("stremio-addon-sdk");
const axios = require("axios");
const cheerio = require("cheerio");

const manifest = {
    id: "com.movierulz.tamil.vercel",
    version: "1.0.0",
    name: "MovieRulz Tamil Featured",
    description: "Latest Tamil Featured movies from MovieRulz",
    resources: ["catalog"],
    types: ["movie"],
    idPrefixes: ["tt"],
    catalogs: [{ 
        type: "movie", 
        id: "mr-tamil", 
        name: "Tamil Featured (MovieRulz)" 
    }]
};

const builder = new addonBuilder(manifest);

builder.defineCatalogHandler(async ({ type, id }) => {
    if (type === "movie" && id === "mr-tamil") {
        try {
            const { data } = await axios.get("https://www.5movierulz.hockey/category/tamil-featured", {
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            const $ = cheerio.load(data);
            const metas = [];

            $(".post-article").each((i, el) => {
                const title = $(el).find(".entry-title a").text().trim();
                const poster = $(el).find(".post-thumbnail img").attr("src");
                metas.push({
                    id: `mr_tamil_${i}`, 
                    type: "movie",
                    name: title,
                    poster: poster
                });
            });
            return { metas };
        } catch (e) {
            return { metas: [] };
        }
    }
    return { metas: [] };
});

const addonInterface = builder.getInterface();

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const url = req.url;

    // Fix: Stremio often requests manifest.json with a / at the start
    if (url.endsWith('manifest.json') || url === '/' || url === '') {
        return res.json(addonInterface.manifest);
    }

    // Fix: Routing for the Catalog
    if (url.includes('/catalog/movie/mr-tamil')) {
        const catalog = await addonInterface.get('catalog', 'movie', 'mr-tamil');
        return res.json(catalog);
    }

    res.status(404).json({ error: "Not found", path: url });
};
