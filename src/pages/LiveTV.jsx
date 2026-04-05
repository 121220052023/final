import { useState } from 'react';
import { motion } from 'framer-motion';
import { Tv, Radio, MonitorPlay, Activity } from 'lucide-react';

const LIVE_CHANNELS = [
    {
        id: 'bein-sports-1',
        name: 'beIN Sports 1 Premium',
        category: 'Sports',
        logo: 'https://upload.wikimedia.org/wikipedia/commons/e/ec/BeIN_Sports_1_Premium_%E2%80%93_New_Brand_%282021%29.png',
        url: 'https://cdn.sportcast.life/embed77/?event=ob.php?ch=1' // Using generic public sports iframe proxies. We'll use a reliable free host if possible.
    },
    {
        id: 'bein-sports-2',
        name: 'beIN Sports 2 Premium',
        category: 'Sports',
        logo: 'https://upload.wikimedia.org/wikipedia/commons/e/e6/BeIN_Sports_2_Premium_%E2%80%93_New_Brand_%282021%29.png',
        url: 'https://cdn.sportcast.life/embed77/?event=ob.php?ch=2'
    },
    {
        id: 'bein-sports-news',
        name: 'beIN Sports News',
        category: 'Sports',
        logo: 'https://upload.wikimedia.org/wikipedia/commons/5/5e/BeIN_Sports_News_%E2%80%93_New_Brand_%282021%29.png',
        url: 'https://www.youtube.com/embed/5O1j5y4TjYg?autoplay=1' // Real live YouTube feed usually available
    },
    {
        id: 'mbc-1',
        name: 'MBC 1',
        category: 'Entertainment',
        logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/5/52/MBC1_logo.svg/1200px-MBC1_logo.svg.png',
        url: 'https://shasha.tv/embed/mbc1'
    },
    {
        id: 'al-jazeera',
        name: 'Al Jazeera Arabic',
        category: 'News',
        logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/f/f2/Aljazeera_logo.svg/1200px-Aljazeera_logo.svg.png',
        url: 'https://www.youtube.com/embed/bBqxuROhyAQ?autoplay=1'
    }
];

const LiveTV = () => {
    const [activeChannel, setActiveChannel] = useState(LIVE_CHANNELS[0]);
    const [loading, setLoading] = useState(false);

    const handleChannelSelect = (channel) => {
        setLoading(true);
        setActiveChannel(channel);
        setTimeout(() => setLoading(false), 800);
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white pt-24 pb-12">
            <div className="container mx-auto px-4 max-w-7xl">

                <div className="flex items-center gap-3 mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg shadow-red-500/20">
                        <Radio className="w-6 h-6 text-white animate-pulse" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black tracking-tight">Live TV</h1>
                        <div className="flex items-center gap-2 text-white/50 text-sm font-medium mt-1">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            Streaming Arabic & Sports Channels
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Player Section */}
                    <div className="lg:col-span-3 flex flex-col gap-4">
                        <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-white/10 bg-black shadow-2xl group">
                            {loading && (
                                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm">
                                    <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
                                    <p className="text-red-500 text-sm font-bold uppercase tracking-widest mt-4">Connecting to Broadcast...</p>
                                </div>
                            )}

                            <iframe
                                key={activeChannel.id}
                                src={activeChannel.url}
                                className="absolute inset-0 w-full h-full"
                                frameBorder="0"
                                allowFullScreen
                                allow="autoplay; encrypted-media"
                                title={activeChannel.name}
                            />

                            <div className="absolute top-4 left-4 z-20 px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 flex items-center gap-2">
                                <Activity className="w-4 h-4 text-red-500 animate-pulse" />
                                <span className="text-xs font-bold uppercase tracking-widest text-white/90">LIVE</span>
                            </div>
                        </div>

                        <div className="p-6 rounded-2xl bg-[#111] border border-white/5 flex items-center gap-6">
                            <div className="w-20 h-20 rounded-xl bg-white/5 p-2 flex items-center justify-center border border-white/10">
                                <img src={activeChannel.logo} alt={activeChannel.name} className="max-w-full max-h-full object-contain filter drop-shadow-md" />
                            </div>
                            <div>
                                <div className="text-xs font-black uppercase tracking-widest text-red-500 mb-1">{activeChannel.category}</div>
                                <h2 className="text-2xl font-black text-white">{activeChannel.name}</h2>
                                <p className="text-white/40 text-sm font-medium mt-1">Direct live broadcast. Refresh if the stream drops.</p>
                            </div>
                        </div>
                    </div>

                    {/* Channels List */}
                    <div className="lg:col-span-1">
                        <div className="bg-[#111] border border-white/5 rounded-2xl flex flex-col h-[600px] overflow-hidden">
                            <div className="p-4 border-b border-white/5 bg-[#151515] flex items-center gap-2">
                                <Tv className="w-4 h-4 text-white/50" />
                                <h3 className="font-bold text-sm text-white/90 uppercase tracking-widest">Channel List</h3>
                            </div>
                            <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                                {LIVE_CHANNELS.map(channel => (
                                    <button
                                        key={channel.id}
                                        onClick={() => handleChannelSelect(channel)}
                                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all border ${activeChannel.id === channel.id
                                                ? 'bg-red-500/10 border-red-500/30'
                                                : 'bg-white/5 border-transparent hover:bg-white/10 hover:border-white/10'
                                            }`}
                                    >
                                        <div className="w-12 h-12 rounded-lg bg-white/5 p-1 flex items-center justify-center shrink-0">
                                            <img src={channel.logo} alt={channel.name} className="max-w-full max-h-full object-contain" />
                                        </div>
                                        <div className="flex-1 text-left min-w-0">
                                            <p className={`text-sm font-bold truncate ${activeChannel.id === channel.id ? 'text-white' : 'text-white/70'}`}>
                                                {channel.name}
                                            </p>
                                            <p className="text-[10px] uppercase tracking-widest text-white/40 mt-0.5">{channel.category}</p>
                                        </div>
                                        {activeChannel.id === channel.id && (
                                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default LiveTV;
