const { addonBuilder } = require("stremio-addon-sdk");
const axios = require("axios");
const cheerio = require("cheerio");

const manifest = {
    id: "com.movierulz.tamil.vercel",
    version: "1.0.0",
    name: "MovieRulz Tamil Featured",
    description: "Latest Tamil Featured movies (Free Vercel Host)",
    resources: ["catalog"],
    types: ["movie"],
    idPrefixes: ["tt"],
    catalogs: [{ type: "movie", id: "mr-tamil", name: "Tamil Featured (MovieRulz)" }]
};

const builder = new addonBuilder(manifest);

builder.defineCatalogHandler(async ({ type, id }) => {
    if (type === "movie" && id === "mr-tamil") {
        try {
            // Updated URL for the site
            const { data } = await axios.get("https://www.5movierulz.hockey/category/tamil-featured", {
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            const $ = cheerio.load(data);
            const metas = [];

            $(".post-article").each((i, el) => {
                const title = $(el).find(".entry-title a").text().trim();
                const poster = $(el).find(".post-thumbnail img").attr("src");
                metas.push({
                    id: `mr_tamil_${i}`, // Note: Streams will only work if you use IMDb IDs
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
    res.setHeader('Content-Type', 'application/json');
    const url = req.url;

    if (url.includes('manifest.json')) {
        return res.json(addonInterface.manifest);
    }
    if (url.includes('/catalog/')) {
        const parts = url.split('/');
        const type = parts[parts.indexOf('catalog') + 1];
        const id = parts[parts.indexOf('catalog') + 2].replace('.json', '');
        const catalog = await addonInterface.get('catalog', type, id);
        return res.json(catalog);
    }
    res.status(404).json({ error: "Not found" });
};
