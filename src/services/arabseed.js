import axios from 'axios';
import * as cheerio from 'cheerio';

const ARABSEED_URL = 'https://asd.pics';
const PROXY_URL = 'https://api.allorigins.win/raw?url=';

// Helper to use allorigins proxy
const fetchViaProxy = async (targetUrl) => {
    try {
        const url = encodeURIComponent(targetUrl);
        const res = await axios.get(`${PROXY_URL}${url}`);
        // When using /raw, the data is returned directly instead of wrapped in .contents
        return res.data;
    } catch (error) {
        console.error('Error fetching via proxy:', error);
        return null;
    }
};

export const arabseedApi = {
    // 1. Scrape Ramadan 2026 Category directly
    getRamadanSeries: async (page = 1) => {
        try {
            // ArabSeed Ramadan 2026 category URL structure
            const targetUrl = page === 1
                ? `${ARABSEED_URL}/category/مسلسلات-رمضان/ramadan-series-2026/`
                : `${ARABSEED_URL}/category/مسلسلات-رمضان/ramadan-series-2026/page/${page}/`;

            const html = await fetchViaProxy(targetUrl);
            if (!html) return { results: [], total_pages: 1 };

            const $ = cheerio.load(html);
            const results = [];

            // Extract items from Arabseed grid (typically .MovieBlock or similar)
            // Note: arabseed uses .MovieBlock, a tags, img tags inside
            $('.MovieBlock, .BlockItem').each((i, el) => {
                const linkEl = $(el).find('a').first();
                const link = linkEl.attr('href');
                const title = $(el).find('.Title, h3').text().trim() || linkEl.attr('title') || '';
                const imgEl = $(el).find('img').first();
                const poster = imgEl.attr('data-src') || imgEl.attr('src');

                // Extract an ID from the link for internal routing if possible, otherwise use a hash
                let id = link ? link.split('/').filter(Boolean).pop() : Math.random().toString();

                if (title && poster) {
                    results.push({
                        id,
                        title,
                        poster_path: poster,
                        media_type: 'tv',
                        vote_average: 0,
                        arabseed_link: link,
                        is_arabseed_direct: true
                    });
                }
            });

            // Try to find pagination to determine total pages
            let total_pages = page;
            const nextPage = $('.pagination, .page-numbers').find('a.next').length > 0;
            if (nextPage) total_pages = page + 1;

            return { results, total_pages };
        } catch (error) {
            console.error('ArabSeed Scraper Error (Ramadan):', error);
            return { results: [], total_pages: 1 };
        }
    },

    // 2. Search for a specific movie/series to grab server iframes
    getServersForTitle: async (title) => {
        try {
            // Search Arabseed
            const searchUrl = `${ARABSEED_URL}/?s=${encodeURIComponent(title)}`;
            const searchHtml = await fetchViaProxy(searchUrl);
            if (!searchHtml) return [];

            const $search = cheerio.load(searchHtml);
            const firstResult = $search('.MovieBlock a, .BlockItem a').first().attr('href');

            if (!firstResult) return [];

            return await arabseedApi.getServersFromUrl(firstResult);

        } catch (error) {
            console.error('ArabSeed Scraper Error (Servers):', error);
            return [];
        }
    },

    // 3. Extract servers directly from an ArabSeed watch URL
    getServersFromUrl: async (watchUrl) => {
        try {
            // Fetch the watch page
            const watchHtml = await fetchViaProxy(watchUrl);
            if (!watchHtml) return [];

            const $watch = cheerio.load(watchHtml);
            const servers = [];

            // Extract iframes
            $watch('iframe').each((i, el) => {
                const src = $watch(el).attr('src') || $watch(el).attr('data-src');
                if (src && src.startsWith('http')) {
                    servers.push({
                        name: `ArabSeed Server ${i + 1}`,
                        url: src,
                        type: 'iframe'
                    });
                }
            });

            // Extract data-server attributes from server lists
            $watch('[data-server], [data-link], .server').each((i, el) => {
                const link = $watch(el).attr('data-link') || $watch(el).attr('data-server');
                if (link && link.startsWith('http')) {
                    servers.push({
                        name: $watch(el).text().trim() || `ArabSeed Link ${i + 1}`,
                        url: link,
                        type: 'embed'
                    });
                }
            });

            // Return unique servers by URL
            const uniqueServers = Array.from(new Map(servers.map(s => [s.url, s])).values());
            return uniqueServers;
        } catch (error) {
            console.error('ArabSeed URL Scraper Error:', error);
            return [];
        }
    }
};
