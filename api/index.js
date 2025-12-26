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
    catalogs: [{ type: "movie", id: "mr-tamil", name: "Tamil Featured (MovieRulz)" }]
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
                // We use a dummy ID here; in a perfect version, you'd fetch the IMDb ID
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
    const url = req.url;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Content-Type', 'application/json');

    if (url.endsWith('manifest.json')) return res.send(addonInterface.manifest);
    if (url.includes('/catalog/')) {
        const [,, type, id] = url.split('/');
        const catalog = await addonInterface.get('catalog', type, id.replace('.json', ''));
        return res.send(catalog);
    }
    res.status(404).send({ error: "Not found" });
};
