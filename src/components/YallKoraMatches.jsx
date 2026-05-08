import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, Trophy, RefreshCw, Loader2 } from 'lucide-react';

const YallKoraMatches = () => {
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedDate, setSelectedDate] = useState(() => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    });

    const fetchMatches = async (date) => {
        setLoading(true);
        setError(null);
        
        try {
            const formattedDate = date.split('-').reverse().join('/');
            const url = `https://www.yallakora.com/match-center/?date=${formattedDate}`;
            
            const response = await fetch(
                `https://corsproxy.io/?${encodeURIComponent(url)}`
            );
            
            if (!response.ok) throw new Error('Failed to fetch matches');
            
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            const matchDetails = [];
            const championships = doc.querySelectorAll('div.matchCard');
            
            championships.forEach((championship) => {
                const h2 = championship.querySelector('h2');
                const championshipTitle = h2?.textContent?.trim() || 'Unknown';
                const allMatches = championship.querySelectorAll('div.item');
                
                allMatches.forEach((match) => {
                    const teamA = match.querySelector('.teamA')?.textContent?.trim() || 'N/A';
                    const teamB = match.querySelector('.teamB')?.textContent?.trim() || 'N/A';
                    const mresult = match.querySelector('.MResult');
                    const scores = mresult?.querySelectorAll('.score');
                    const score = scores && scores.length >= 2 
                        ? `${scores[0]?.textContent?.trim() || ''} - ${scores[1]?.textContent?.trim() || ''}`
                        : 'vs';
                    const time = mresult?.querySelector('.time')?.textContent?.trim() || 'TBD';
                    
                    matchDetails.push({
                        id: `${championshipTitle}-${teamA}-${teamB}-${Date.now()}-${Math.random()}`,
                        championship: championshipTitle,
                        teamA: teamA,
                        teamB: teamB,
                        score: score,
                        time: time
                    });
                });
            });
            
            setMatches(matchDetails);
            if (matchDetails.length === 0) {
                setError('No matches found for this date');
            }
        } catch (err) {
            console.error('Error fetching matches:', err);
            setError('Failed to load matches. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMatches(selectedDate);
    }, [selectedDate]);

    const groupedMatches = matches.reduce((acc, match) => {
        if (!acc[match.championship]) {
            acc[match.championship] = [];
        }
        acc[match.championship].push(match);
        return acc;
    }, {});

    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { 
            weekday: 'long', 
            month: 'long', 
            day: 'numeric',
            year: 'numeric'
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                    <h3 className="text-xl font-bold text-foreground">Match Schedule</h3>
                    <p className="text-sm text-muted-foreground">Football matches from Yallakora</p>
                </div>
                <div className="flex items-center gap-3">
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="px-4 py-2 bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                    <button
                        onClick={() => fetchMatches(selectedDate)}
                        disabled={loading}
                        className="p-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            <div className="bg-card rounded-xl border border-border p-4">
                <div className="flex items-center gap-2 mb-4">
                    <Calendar className="w-5 h-5 text-primary" />
                    <span className="font-medium text-foreground">{formatDate(selectedDate)}</span>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
                        <p className="text-muted-foreground">Loading matches...</p>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <p className="text-red-500 mb-4">{error}</p>
                        <button
                            onClick={() => fetchMatches(selectedDate)}
                            className="btn-primary px-4 py-2"
                        >
                            Try Again
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {Object.entries(groupedMatches).map(([championship, championshipMatches]) => (
                            <div key={championship}>
                                <div className="flex items-center gap-2 mb-3">
                                    <Trophy className="w-4 h-4 text-yellow-500" />
                                    <h4 className="font-bold text-foreground">{championship}</h4>
                                    <span className="text-xs text-muted-foreground">({championshipMatches.length})</span>
                                </div>
                                <div className="space-y-2">
                                    {championshipMatches.map((match) => (
                                        <motion.div
                                            key={match.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="flex items-center justify-between p-4 bg-muted/40 rounded-xl hover:bg-muted/60 transition-colors"
                                        >
                                            <div className="flex-1 text-center">
                                                <p className="font-bold text-foreground">{match.teamA}</p>
                                            </div>
                                            <div className="px-6 text-center">
                                                <div className="bg-primary/10 text-primary font-bold text-lg px-4 py-2 rounded-lg">
                                                    {match.score}
                                                </div>
                                                <div className="flex items-center justify-center gap-1 mt-2 text-sm text-muted-foreground">
                                                    <Clock className="w-3 h-3" />
                                                    <span>{match.time}</span>
                                                </div>
                                            </div>
                                            <div className="flex-1 text-center">
                                                <p className="font-bold text-foreground">{match.teamB}</p>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="text-center text-xs text-muted-foreground">
                <p>Match data sourced from yallakora.com</p>
                <p className="mt-1">Last updated: {new Date().toLocaleTimeString()}</p>
            </div>
        </div>
    );
};

export default YallKoraMatches;
