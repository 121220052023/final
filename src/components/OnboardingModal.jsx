import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ChevronRight, ChevronLeft, Check, Shield, Heart, Film, Tv, BookOpen } from 'lucide-react';
import { settingsService } from '../services/settingsService';
import { toast } from 'sonner';

const GENRE_OPTIONS = [
  { id: 'action', label: 'Action', icon: '💥' },
  { id: 'comedy', label: 'Comedy', icon: '😂' },
  { id: 'drama', label: 'Drama', icon: '🎭' },
  { id: 'horror', label: 'Horror', icon: '👻' },
  { id: 'romance', label: 'Romance', icon: '❤️' },
  { id: 'sci-fi', label: 'Sci-Fi', icon: '🚀' },
  { id: 'thriller', label: 'Thriller', icon: '🔪' },
  { id: 'animation', label: 'Animation', icon: '🎨' },
  { id: 'documentary', label: 'Documentary', icon: '📹' },
  { id: 'fantasy', label: 'Fantasy', icon: '🧙' },
  { id: 'mystery', label: 'Mystery', icon: '🔍' },
  { id: 'adventure', label: 'Adventure', icon: '🗺️' },
];

const CONTENT_TYPE_OPTIONS = [
  { id: 'movies', label: 'Movies', icon: Film },
  { id: 'tv', label: 'TV Shows', icon: Tv },
  { id: 'books', label: 'Books', icon: BookOpen },
  { id: 'anime', label: 'Anime', icon: Sparkles },
];

export default function OnboardingModal({ onClose, isFirstTime = true }) {
  const [step, setStep] = useState(0);
  const [age, setAge] = useState('');
  const [isAdult, setIsAdult] = useState(true);
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [saving, setSaving] = useState(false);

  const totalSteps = 3;

  const toggleGenre = (id) => {
    setSelectedGenres(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    );
  };

  const toggleType = (id) => {
    setSelectedTypes(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const handleAgeNext = () => {
    const ageNum = parseInt(age);
    if (!ageNum || ageNum < 5 || ageNum > 120) {
      toast.error('Please enter a valid age');
      return;
    }
    setIsAdult(ageNum >= 18);
    setStep(1);
  };

  const handleGenresNext = () => {
    if (selectedGenres.length === 0) {
      toast.error('Please select at least one genre');
      return;
    }
    setStep(2);
  };

  const handleComplete = async () => {
    setSaving(true);
    try {
      await settingsService.upsert({
        age: parseInt(age),
        is_adult: isAdult,
        onboarding_completed: true,
        preferred_genres: JSON.stringify(selectedGenres),
        preferred_types: JSON.stringify(selectedTypes),
      });
      toast.success('Preferences saved!');
      onClose();
    } catch (err) {
      console.error('Onboarding save error:', err);
      toast.error('Failed to save: ' + (err.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const canProceed = () => {
    if (step === 0) return age && parseInt(age) >= 5;
    if (step === 1) return selectedGenres.length > 0;
    if (step === 2) return selectedTypes.length > 0;
    return true;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="editorial-panel rounded-[2rem] p-6 sm:p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-all ${
                i <= step ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Step 0: Age */}
          {step === 0 && (
            <motion.div
              key="age"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="display-font text-2xl font-bold text-foreground">
                    {isFirstTime ? 'Welcome!' : 'Update Your Profile'}
                  </h2>
                  <p className="text-sm text-muted-foreground">How old are you?</p>
                </div>
              </div>

              <p className="text-sm text-muted-foreground mb-6">
                We use this to filter age-appropriate content. If you&apos;re under 18, mature content will be hidden.
              </p>

              <input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="Enter your age"
                min="5"
                max="120"
                className="text-input text-center text-2xl font-bold py-4"
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') handleAgeNext(); }}
              />

              {age && parseInt(age) < 18 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20"
                >
                  <p className="text-sm text-amber-400">
                    🔒 Mature content (R-rated movies, adult themes) will be filtered out. A parent can adjust this later in settings.
                  </p>
                </motion.div>
              )}

              {age && parseInt(age) >= 18 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-4 p-4 rounded-xl bg-green-500/10 border border-green-500/20"
                >
                  <p className="text-sm text-green-400">
                    ✅ Full catalog access enabled. You can change content filters anytime in your profile.
                  </p>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* Step 1: Genre Preferences */}
          {step === 1 && (
            <motion.div
              key="genres"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Heart className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="display-font text-2xl font-bold text-foreground">Your Taste</h2>
                  <p className="text-sm text-muted-foreground">Pick your favorite genres (select multiple)</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {GENRE_OPTIONS.map((genre) => (
                  <button
                    key={genre.id}
                    onClick={() => toggleGenre(genre.id)}
                    className={`p-3 rounded-xl text-center transition-all ${
                      selectedGenres.includes(genre.id)
                        ? 'bg-primary/10 border-2 border-primary text-primary'
                        : 'bg-background border border-border hover:border-primary/30'
                    }`}
                  >
                    <span className="text-2xl block mb-1">{genre.icon}</span>
                    <span className="text-xs font-semibold">{genre.label}</span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3 text-center">
                {selectedGenres.length} selected
              </p>
            </motion.div>
          )}

          {/* Step 2: Content Types */}
          {step === 2 && (
            <motion.div
              key="types"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Film className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="display-font text-2xl font-bold text-foreground">What do you watch?</h2>
                  <p className="text-sm text-muted-foreground">Select the types of content you enjoy</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {CONTENT_TYPE_OPTIONS.map((type) => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.id}
                      onClick={() => toggleType(type.id)}
                      className={`p-5 rounded-2xl text-center transition-all flex flex-col items-center gap-3 ${
                        selectedTypes.includes(type.id)
                          ? 'bg-primary/10 border-2 border-primary text-primary'
                          : 'bg-background border border-border hover:border-primary/30'
                      }`}
                    >
                      <Icon className="w-8 h-8" />
                      <span className="text-sm font-bold">{type.label}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8">
          {step > 0 ? (
            <button
              onClick={() => setStep(s => s - 1)}
              className="btn-secondary px-5 py-3 flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
          ) : (
            <button
              onClick={onClose}
              className="btn-ghost px-4 py-3 text-muted-foreground"
            >
              Skip for now
            </button>
          )}

          {step < totalSteps - 1 ? (
            <button
              onClick={step === 0 ? handleAgeNext : step === 1 ? handleGenresNext : () => setStep(2)}
              disabled={!canProceed()}
              className="btn-primary px-6 py-3 flex items-center gap-2 disabled:opacity-40"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={!canProceed() || saving}
              className="btn-primary px-6 py-3 flex items-center gap-2 disabled:opacity-40"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              {saving ? 'Saving...' : 'Done'}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
