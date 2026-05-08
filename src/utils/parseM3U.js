export const parseM3U = (content) => {
    const lines = content.split('\n');
    const channels = [];
    let currentChannel = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (line.startsWith('#EXTINF:')) {
            const info = line.replace('#EXTINF:', '');
            const parts = info.split(',');
            const attributes = parts[0];
            const name = parts[1] || 'Unknown';

            const attrs = {};
            const attrMatches = attributes.matchAll(/([\w-]+)="([^"]*)"/g);
            for (const match of attrMatches) {
                attrs[match[1]] = match[2];
            }

            currentChannel = {
                id: `channel-${channels.length}-${Date.now()}`,
                name: name.trim(),
                logo: attrs['tvg-logo'] || '',
                category: attrs['group-title'] || 'General',
                country: attrs['country'] || '',
                language: attrs['language'] || '',
                attributes: attrs
            };
        } else if (line && !line.startsWith('#') && currentChannel) {
            let url = line;

            if (url.startsWith('//')) {
                url = 'https:' + url;
            }

            currentChannel.url = url;
            
            if (currentChannel.url.includes('.ts')) {
                currentChannel.type = 'ts';
            } else if (currentChannel.url.includes('.m3u8')) {
                currentChannel.type = 'hls';
            } else if (currentChannel.url.includes('youtube.com') || currentChannel.url.includes('youtu.be')) {
                currentChannel.type = 'youtube';
            } else if (
                currentChannel.url.includes('stmify.com') ||
                currentChannel.url.includes('kora-yalla') ||
                currentChannel.url.includes('yallashoot') ||
                currentChannel.url.includes('embedme.top') ||
                currentChannel.url.includes('streamed.su') ||
                currentChannel.url.includes('sportplus.live') ||
                currentChannel.url.includes('streamprotect') ||
                currentChannel.url.includes('flasport') ||
                currentChannel.url.includes('livesport') ||
                currentChannel.url.includes('koralive') ||
                currentChannel.url.includes('ronaldo7') ||
                currentChannel.url.includes('sport24live') ||
                currentChannel.url.includes('vipleague') ||
                currentChannel.url.includes('batmanstream') ||
                currentChannel.url.includes('soccerstreams') ||
                currentChannel.url.includes('yallakora') ||
                currentChannel.url.includes('sportsurge') ||
                currentChannel.url.includes('crackstreams')
            ) {
                currentChannel.type = 'embed';
            } else {
                currentChannel.type = 'unknown';
            }

            channels.push(currentChannel);
            currentChannel = null;
        }
    }

    return channels;
};

export const filterChannels = (channels, searchTerm, category) => {
    return channels.filter(channel => {
        const matchesSearch = !searchTerm || 
            channel.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            channel.category.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesCategory = !category || category === 'All' || 
            channel.category.toLowerCase().includes(category.toLowerCase());
        
        return matchesSearch && matchesCategory;
    });
};

export const groupChannelsByCategory = (channels) => {
    const grouped = {};
    
    channels.forEach(channel => {
        const category = channel.category || 'Other';
        if (!grouped[category]) {
            grouped[category] = [];
        }
        grouped[category].push(channel);
    });
    
    return grouped;
};

export const getCategories = (channels) => {
    const categories = new Set(['All']);
    channels.forEach(channel => {
        if (channel.category) {
            categories.add(channel.category);
        }
    });
    return Array.from(categories);
};
