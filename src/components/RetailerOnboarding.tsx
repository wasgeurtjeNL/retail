'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircleIcon,
  ChevronRightIcon,
  SparklesIcon,
  UserCircleIcon,
  GlobeAltIcon,
  LightBulbIcon,
  RocketLaunchIcon,
  XMarkIcon,
  ClockIcon,
  TrophyIcon
} from '@heroicons/react/24/outline';
import { CheckIcon } from '@heroicons/react/24/solid';
import { useRouter } from 'next/navigation';

interface OnboardingProgressData {
  current_step: number;
  total_steps: number;
  steps_completed: Record<string, boolean>;
  onboarding_data?: Record<string, any>;
  completed_at?: string;
}

interface OnboardingStepData {
  step_number: number;
  step_key: string;
  title: string;
  description?: string;
  is_required: boolean;
  estimated_time_minutes?: number;
  reward_points?: number;
}

interface RetailerOnboardingProps {
  profileId: string;
  onComplete?: () => void;
  onSkip?: () => void;
}

const STEP_ICONS: Record<string, any> = {
  welcome: SparklesIcon,
  profile_complete: UserCircleIcon,
  website_analysis: GlobeAltIcon,
  first_advice: LightBulbIcon,
  explore_features: RocketLaunchIcon
};

export default function RetailerOnboarding({ profileId, onComplete, onSkip }: RetailerOnboardingProps) {
  const router = useRouter();
  const [progress, setProgress] = useState<OnboardingProgressData | null>(null);
  const [steps, setSteps] = useState<OnboardingStepData[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    fetchOnboardingData();
  }, [profileId]);

  const fetchOnboardingData = async () => {
    try {
      // Fetch progress
      const progressRes = await fetch(`/api/onboarding/progress?profile_id=${profileId}`);
      const progressData = await progressRes.json();

      // Fetch steps
      const stepsRes = await fetch('/api/onboarding/steps');
      const stepsData = await stepsRes.json();

      setProgress(progressData.progress);
      setSteps(stepsData.steps || []);
      
      // Set current step based on progress
      const currentStep = progressData.progress?.current_step || 1;
      setCurrentStepIndex(Math.max(0, currentStep - 1));
    } catch (error) {
      console.error('Error fetching onboarding data:', error);
    } finally {
      setLoading(false);
    }
  };

  const completeStep = async (stepKey: string, stepData?: any) => {
    setCompleting(true);
    try {
      const response = await fetch('/api/onboarding/complete-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile_id: profileId,
          step_key: stepKey,
          step_data: stepData
        })
      });

      const result = await response.json();
      
      if (result.success) {
        // Update local progress
        setProgress(prev => ({
          ...prev!,
          steps_completed: {
            ...prev?.steps_completed,
            [stepKey]: true
          },
          current_step: result.next_step
        }));

        // Show points earned
        if (result.points_earned > 0) {
          // Could show a toast notification here
          console.log(`Earned ${result.points_earned} points!`);
        }

        // Check if all required steps are complete
        if (result.all_required_complete) {
          setShowConfetti(true);
          setTimeout(() => {
            onComplete?.();
          }, 2000);
        } else {
          // Move to next step
          if (currentStepIndex < steps.length - 1) {
            setCurrentStepIndex(currentStepIndex + 1);
          }
        }
      }
    } catch (error) {
      console.error('Error completing step:', error);
    } finally {
      setCompleting(false);
    }
  };

  const skipOnboarding = async () => {
    try {
      await fetch('/api/onboarding/skip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile_id: profileId })
      });
      onSkip?.();
    } catch (error) {
      console.error('Error skipping onboarding:', error);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-lg w-full mx-4">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const currentStep = steps[currentStepIndex];
  if (!currentStep) return null;

  const StepIcon = STEP_ICONS[currentStep.step_key] || SparklesIcon;
  const progressPercentage = ((currentStepIndex + 1) / steps.length) * 100;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <StepIcon className="h-8 w-8" />
                <div>
                  <h2 className="text-2xl font-bold">Wasgeurtje Success Program</h2>
                  <p className="text-indigo-100">Stap {currentStep.step_number} van {steps.length}</p>
                </div>
              </div>
              <button
                onClick={skipOnboarding}
                className="text-white/80 hover:text-white transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-white/20 rounded-full h-2">
              <motion.div
                className="bg-white h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercentage}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {currentStep.title}
            </h3>
            {currentStep.description && (
              <p className="text-gray-600 mb-6">{currentStep.description}</p>
            )}

            {/* Step-specific content */}
            {currentStep.step_key === 'welcome' && (
              <WelcomeStep onComplete={() => completeStep('welcome')} />
            )}
            {currentStep.step_key === 'profile_complete' && (
              <ProfileCompleteStep 
                profileId={profileId}
                onComplete={(data) => completeStep('profile_complete', data)} 
              />
            )}
            {currentStep.step_key === 'website_analysis' && (
              <WebsiteAnalysisStep 
                profileId={profileId}
                onComplete={() => completeStep('website_analysis')} 
              />
            )}
            {currentStep.step_key === 'first_advice' && (
              <FirstAdviceStep 
                profileId={profileId}
                onComplete={() => completeStep('first_advice')} 
              />
            )}
            {currentStep.step_key === 'explore_features' && (
              <ExploreFeaturesStep onComplete={() => completeStep('explore_features')} />
            )}

            {/* Step Info */}
            <div className="mt-6 pt-6 border-t border-gray-200 flex items-center justify-between text-sm text-gray-500">
              <div className="flex items-center gap-4">
                {currentStep.estimated_time_minutes && (
                  <span className="flex items-center gap-1">
                    <ClockIcon className="h-4 w-4" />
                    {currentStep.estimated_time_minutes} min
                  </span>
                )}
                {currentStep.reward_points && (
                  <span className="flex items-center gap-1">
                    <TrophyIcon className="h-4 w-4" />
                    +{currentStep.reward_points} punten
                  </span>
                )}
              </div>
              {currentStep.is_required && (
                <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded">
                  Verplicht
                </span>
              )}
            </div>
          </div>

          {/* Step indicators */}
          <div className="px-6 pb-6">
            <div className="flex items-center justify-center gap-2">
              {steps.map((step, index) => (
                <div
                  key={step.step_key}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentStepIndex
                      ? 'bg-indigo-600 w-8'
                      : progress?.steps_completed[step.step_key]
                      ? 'bg-green-500'
                      : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
        </motion.div>

        {/* Confetti animation */}
        {showConfetti && (
          <div className="fixed inset-0 pointer-events-none z-[60]">
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="text-6xl"
              >
                🎉
              </motion.div>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

// Step Components
function WelcomeStep({ onComplete }: { onComplete: () => void }) {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-6">
        <h4 className="font-semibold text-lg mb-3">Wat je kunt verwachten:</h4>
        <ul className="space-y-3">
          <li className="flex items-start gap-3">
            <CheckCircleIcon className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <strong>Gepersonaliseerde Sales Tips</strong>
              <p className="text-sm text-gray-600">Op basis van jouw business en doelgroep</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <CheckCircleIcon className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <strong>Gamification & Rewards</strong>
              <p className="text-sm text-gray-600">Verdien punten en unlock achievements</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <CheckCircleIcon className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <strong>Meetbare Resultaten</strong>
              <p className="text-sm text-gray-600">Track je omzetgroei en ROI</p>
            </div>
          </li>
        </ul>
      </div>

      <button
        onClick={onComplete}
        className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium flex items-center justify-center gap-2"
      >
        Laten we beginnen!
        <ChevronRightIcon className="h-5 w-5" />
      </button>
    </div>
  );
}

function ProfileCompleteStep({ profileId, onComplete }: { profileId: string; onComplete: (data: any) => void }) {
  const [businessGoals, setBusinessGoals] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [currentChallenges, setCurrentChallenges] = useState('');

  const handleSubmit = () => {
    onComplete({
      business_goals: businessGoals,
      target_audience: targetAudience,
      current_challenges: currentChallenges
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Wat zijn je belangrijkste business doelen?
        </label>
        <textarea
          value={businessGoals}
          onChange={(e) => setBusinessGoals(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
          rows={3}
          placeholder="Bijv. meer klanten, hogere omzet per klant, nieuwe markten..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Wie is je ideale klant voor Wasgeurtje?
        </label>
        <input
          type="text"
          value={targetAudience}
          onChange={(e) => setTargetAudience(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
          placeholder="Bijv. jonge gezinnen, eco-bewuste consumenten..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Wat zijn je grootste uitdagingen in verkoop?
        </label>
        <textarea
          value={currentChallenges}
          onChange={(e) => setCurrentChallenges(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
          rows={3}
          placeholder="Bijv. klanten overtuigen, concurrentie, seizoensschommelingen..."
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={!businessGoals || !targetAudience}
        className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
      >
        Doorgaan
      </button>
    </div>
  );
}

function WebsiteAnalysisStep({ profileId, onComplete }: { profileId: string; onComplete: () => void }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);

  const startAnalysis = async () => {
    setAnalyzing(true);
    // Simulate analysis (in real app, this would trigger the actual analysis)
    setTimeout(() => {
      setAnalyzing(false);
      setAnalysisComplete(true);
    }, 3000);
  };

  return (
    <div className="space-y-6">
      {!analyzing && !analysisComplete && (
        <>
          <div className="text-center py-8">
            <GlobeAltIcon className="h-16 w-16 text-indigo-600 mx-auto mb-4" />
            <p className="text-gray-600">
              We gaan je website analyseren om gepersonaliseerde sales tips te genereren
            </p>
          </div>
          <button
            onClick={startAnalysis}
            className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
          >
            Start Website Analyse
          </button>
        </>
      )}

      {analyzing && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Analyseren van je website...</p>
          <p className="text-sm text-gray-500 mt-2">Dit duurt ongeveer 30 seconden</p>
        </div>
      )}

      {analysisComplete && (
        <>
          <div className="bg-green-50 rounded-lg p-6 text-center">
            <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h4 className="font-semibold text-lg mb-2">Analyse Compleet!</h4>
            <p className="text-gray-600">
              We hebben waardevolle inzichten gevonden om je sales te boosten
            </p>
          </div>
          <button
            onClick={onComplete}
            className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
          >
            Bekijk je eerste advies
          </button>
        </>
      )}
    </div>
  );
}

function FirstAdviceStep({ profileId, onComplete }: { profileId: string; onComplete: () => void }) {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="bg-green-100 rounded-full p-3">
            <LightBulbIcon className="h-8 w-8 text-green-600" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-lg mb-2">
              🚀 Quick Win: Cross-sell bij de kassa
            </h4>
            <p className="text-gray-700 mb-4">
              Plaats Wasgeurtje samples bij je kassa met een bordje: 
              "Probeer onze nieuwe wasparfums - uw kleding ruikt heerlijk!"
            </p>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-green-600 font-medium">+15% omzet mogelijk</span>
              <span className="text-gray-500">• 10 min setup</span>
              <span className="text-gray-500">• Makkelijk</span>
            </div>
          </div>
        </div>
      </div>

      <p className="text-center text-gray-600">
        Dit is slechts het begin! Er wachten nog veel meer gepersonaliseerde tips op je.
      </p>

      <button
        onClick={onComplete}
        className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
      >
        Start met deze tip
      </button>
    </div>
  );
}

function ExploreFeaturesStep({ onComplete }: { onComplete: () => void }) {
  const features = [
    { icon: '🏆', title: 'Achievements', description: 'Unlock badges en mijlpalen' },
    { icon: '🔥', title: 'Streaks', description: 'Blijf dagelijks actief voor bonussen' },
    { icon: '📊', title: 'Analytics', description: 'Track je voortgang en ROI' },
    { icon: '👥', title: 'Success Stories', description: 'Leer van andere retailers' }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        {features.map((feature, index) => (
          <div key={index} className="bg-gray-50 rounded-lg p-4 text-center">
            <div className="text-3xl mb-2">{feature.icon}</div>
            <h5 className="font-medium text-gray-900">{feature.title}</h5>
            <p className="text-sm text-gray-600 mt-1">{feature.description}</p>
          </div>
        ))}
      </div>

      <div className="bg-indigo-50 rounded-lg p-4 text-center">
        <p className="text-indigo-700 font-medium">
          🎉 Je bent klaar om te beginnen!
        </p>
        <p className="text-sm text-indigo-600 mt-1">
          Verdien je eerste 50 punten door een advies te voltooien
        </p>
      </div>

      <button
        onClick={onComplete}
        className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all font-medium"
      >
        Start je Success Journey!
      </button>
    </div>
  );
} 