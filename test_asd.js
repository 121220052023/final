import axios from 'axios';

(async () => {
    try {
        console.log("Fetching ArabSeed homepage...");
        const res = await axios.get('https://asd.pics/home3/');
        const html = res.data;

        let m;
        const links = [];
        const regex = /href=[\"'](https:\/\/asd\.pics\/[^\/]+\/[^\/]+\/)[\"']/g;
        while ((m = regex.exec(html)) !== null) {
            links.push(m[1]);
        }

        const movieLinks = [...new Set(links)].filter(l => l.includes('-movie') || l.includes('movie-') || l.includes('film') || l.includes('episode') || l.includes('series'));
        console.log('Found Links:', movieLinks.slice(0, 3));

        if (movieLinks.length > 0) {
            console.log("\nFetching details for: " + movieLinks[0]);
            const watchRes = await axios.get(movieLinks[0]);
            const watchHtml = watchRes.data;

            console.log('\n--- IFRAMES ---');
            let m2;
            const iframes = [];
            const iregex = /<iframe[^>]+src=[\"']([^\"']+)[\"']/gi;
            while ((m2 = iregex.exec(watchHtml)) !== null) {
                iframes.push(m2[1]);
            }
            console.log([...new Set(iframes)]);

            console.log('\n--- SERVERS ---');
            let m3;
            const servers = [];
            const sregex = /data-(?:server|link|src)=[\"']([^\"']+)[\"']/gi;
            while ((m3 = sregex.exec(watchHtml)) !== null) {
                servers.push(m3[1]);
            }
            console.log([...new Set(servers)]);
        }
    } catch (e) { console.error('Error:', e.message); }
})();
