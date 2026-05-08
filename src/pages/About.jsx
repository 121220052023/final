import { motion } from 'framer-motion';
import { Film, Brain, Sparkles, Users } from 'lucide-react';

const About = () => {
  const features = [
    {
      icon: Film,
      title: 'Vast Movie Database',
      description: 'Access millions of movies from IMDb\'s comprehensive database with detailed information about cast, crew, ratings, and more.',
    },
    {
      icon: Brain,
      title: 'AI-Powered Intelligence',
      description: 'Our advanced AI models analyze movies and generate human-like summaries, recommendations, and insights tailored to your preferences.',
    },
    {
      icon: Sparkles,
      title: 'Smart Recommendations',
      description: 'Get personalized movie suggestions based on your viewing history, preferences, and AI-driven analysis of similar films.',
    },
    {
      icon: Users,
      title: 'Community Driven',
      description: 'Join a community of movie enthusiasts who share their favorite films, reviews, and recommendations.',
    },
  ];

  const techStack = [
    { name: 'React', description: 'Modern UI framework' },
    { name: 'Tailwind CSS', description: 'Utility-first styling' },
    { name: 'Framer Motion', description: 'Smooth animations' },
    { name: 'IMDb API', description: 'Movie data source' },
    { name: 'OpenRouter AI', description: 'AI intelligence' },
    { name: 'React Router', description: 'Navigation' },
  ];

  return (
    <div className="min-h-screen py-20 px-4">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-5xl font-bold gradient-header bg-clip-text text-transparent mb-4">
            About Ocean of Movies
          </h1>
          <p className="text-muted-foreground text-xl max-w-3xl mx-auto">
            Ocean of Movies is a revolutionary movie discovery platform that combines the power of artificial intelligence 
            with comprehensive movie data to help you find your next favorite film.
          </p>
        </motion.div>

        {/* Mission Statement */}
        <motion.div
          className="bg-card rounded-lg p-8 mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-3xl font-bold text-foreground mb-4">Our Mission</h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            We believe that discovering great movies should be effortless and enjoyable. Our mission is to leverage 
            cutting-edge AI technology to provide personalized, intelligent movie recommendations that match your 
            unique taste and preferences. Whether you&apos;re looking for a classic masterpiece or the latest blockbuster, 
            Ocean of Movies is here to guide your cinematic journey.
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-foreground text-center mb-8">What Makes Us Special</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                className="bg-card rounded-lg p-6 glass-immersive transition-glass-immersive"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
              >
                <feature.icon className="w-12 h-12 text-purple-600 mb-4" />
                <h3 className="text-xl font-bold text-foreground mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Tech Stack */}
        <motion.div
          className="bg-card rounded-lg p-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <h2 className="text-3xl font-bold text-foreground mb-6 text-center">Built With Modern Technology</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {techStack.map((tech, index) => (
              <motion.div
                key={tech.name}
                className="text-center"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8 + index * 0.05 }}
              >
                <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg p-4 mb-2">
                  <h3 className="font-bold text-lg">{tech.name}</h3>
                </div>
                <p className="text-muted-foreground text-sm">{tech.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* How It Works */}
        <motion.div
          className="mt-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
        >
          <h2 className="text-3xl font-bold text-foreground text-center mb-8">How It Works</h2>
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold flex-shrink-0">
                1
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground mb-2">Browse & Search</h3>
                <p className="text-muted-foreground">
                  Explore trending movies or search for specific titles using our powerful search engine powered by IMDb data.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold flex-shrink-0">
                2
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground mb-2">Get AI Insights</h3>
                <p className="text-muted-foreground">
                  Click on any movie to get AI-generated summaries, recommendations, and deep insights about the film.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold flex-shrink-0">
                3
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground mb-2">Build Your Watchlist</h3>
                <p className="text-muted-foreground">
                  Save your favorite movies to your personal watchlist and never forget what to watch next.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default About;

