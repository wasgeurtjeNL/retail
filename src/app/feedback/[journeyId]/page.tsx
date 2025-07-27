// =====================================================
// PROEFPAKKET FEEDBACK PAGE
// Collect structured feedback from proefpakket recipients
// =====================================================

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Star, Package, Truck, ThumbsUp, Send, CheckCircle } from 'lucide-react';

interface FeedbackData {
  overall_rating: number;
  product_quality_rating: number;
  packaging_rating: number;
  delivery_rating: number;
  liked_most: string;
  improvement_suggestions: string;
  additional_comments: string;
  interested_in_partnership: boolean;
  ready_for_follow_up: boolean;
  preferred_contact_method: string;
  best_contact_time: string;
  current_supplier: string;
  monthly_volume_estimate: number | null;
  decision_maker: boolean;
  decision_timeline: string;
}

export default function FeedbackPage() {
  const params = useParams();
  const router = useRouter();
  const journeyId = params.journeyId as string;

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [journey, setJourney] = useState<any>(null);

  const [feedback, setFeedback] = useState<FeedbackData>({
    overall_rating: 0,
    product_quality_rating: 0,
    packaging_rating: 0,
    delivery_rating: 0,
    liked_most: '',
    improvement_suggestions: '',
    additional_comments: '',
    interested_in_partnership: false,
    ready_for_follow_up: true,
    preferred_contact_method: 'email',
    best_contact_time: '',
    current_supplier: '',
    monthly_volume_estimate: null,
    decision_maker: false,
    decision_timeline: 'unsure'
  });

  useEffect(() => {
    loadJourneyDetails();
  }, [journeyId]);

  const loadJourneyDetails = async () => {
    try {
      const response = await fetch(`/api/conversion/feedback?journey_id=${journeyId}`);
      const data = await response.json();

      if (data.success) {
        setJourney(data.data);
      } else {
        setError('Journey not found or feedback already submitted');
      }
    } catch (err) {
      setError('Failed to load journey details');
    }
  };

  const handleRatingChange = (field: keyof FeedbackData, rating: number) => {
    setFeedback(prev => ({
      ...prev,
      [field]: rating
    }));
  };

  const handleInputChange = (field: keyof FeedbackData, value: any) => {
    setFeedback(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate required fields
      if (feedback.overall_rating === 0) {
        throw new Error('Please provide an overall rating');
      }

      const response = await fetch('/api/conversion/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          journey_id: journeyId,
          ...feedback,
          source: 'web_form',
          ip_address: await getClientIP(),
          user_agent: navigator.userAgent
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSubmitted(true);
      } else {
        throw new Error(data.message || 'Failed to submit feedback');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit feedback');
    } finally {
      setLoading(false);
    }
  };

  const getClientIP = async (): Promise<string> => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return '';
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Bedankt voor je feedback!
            </h1>
            <p className="text-gray-600 mb-6">
              We waarderen je tijd en moeite om ons te helpen verbeteren. 
              {feedback.interested_in_partnership && feedback.ready_for_follow_up && (
                ' We nemen binnenkort contact met je op om de mogelijkheden voor samenwerking te bespreken.'
              )}
            </p>
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-blue-900 mb-2">Wat gebeurt er nu?</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                {feedback.interested_in_partnership ? (
                  <>
                    <li>• Je feedback wordt doorgestuurd naar ons sales team</li>
                    <li>• We nemen binnen 2 werkdagen contact met je op</li>
                    <li>• We bespreken de mogelijkheden voor een partnership</li>
                  </>
                ) : (
                  <>
                    <li>• Je feedback helpt ons onze producten te verbeteren</li>
                    <li>• We houden je op de hoogte van nieuwe ontwikkelingen</li>
                    <li>• Je kunt altijd contact opnemen als je interesse krijgt</li>
                  </>
                )}
              </ul>
            </div>
            <button
              onClick={() => router.push('/')}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Terug naar website
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!journey) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            {error ? (
              <>
                <Package className="h-16 w-16 text-gray-400 mx-auto mb-6" />
                <h1 className="text-2xl font-bold text-gray-900 mb-4">
                  Feedback niet beschikbaar
                </h1>
                <p className="text-gray-600">{error}</p>
              </>
            ) : (
              <>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Laden...</p>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Header */}
          <div className="bg-blue-600 text-white p-6">
            <h1 className="text-2xl font-bold mb-2">
              Hoe was je ervaring met ons proefpakket?
            </h1>
            <p className="text-blue-100">
              Jouw feedback helpt ons om onze producten en service te verbeteren
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-8">
            {/* Rating Sections */}
            <div className="space-y-6">
              {/* Overall Rating */}
              <div>
                <label className="block text-lg font-semibold text-gray-900 mb-3">
                  Hoe beoordeel je je algehele ervaring? *
                </label>
                <StarRating
                  rating={feedback.overall_rating}
                  onChange={(rating) => handleRatingChange('overall_rating', rating)}
                  large
                />
              </div>

              {/* Detailed Ratings */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block font-medium text-gray-700 mb-2">
                    Productkwaliteit
                  </label>
                  <StarRating
                    rating={feedback.product_quality_rating}
                    onChange={(rating) => handleRatingChange('product_quality_rating', rating)}
                  />
                </div>

                <div>
                  <label className="block font-medium text-gray-700 mb-2">
                    Verpakking
                  </label>
                  <StarRating
                    rating={feedback.packaging_rating}
                    onChange={(rating) => handleRatingChange('packaging_rating', rating)}
                  />
                </div>

                <div>
                  <label className="block font-medium text-gray-700 mb-2">
                    Bezorging
                  </label>
                  <StarRating
                    rating={feedback.delivery_rating}
                    onChange={(rating) => handleRatingChange('delivery_rating', rating)}
                  />
                </div>
              </div>
            </div>

            {/* Text Feedback */}
            <div className="space-y-6">
              <div>
                <label className="block font-medium text-gray-700 mb-2">
                  Wat vond je het leukst aan het proefpakket?
                </label>
                <textarea
                  value={feedback.liked_most}
                  onChange={(e) => handleInputChange('liked_most', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  rows={3}
                  placeholder="Vertel ons wat je het meest aantrok..."
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-2">
                  Heb je suggesties voor verbetering?
                </label>
                <textarea
                  value={feedback.improvement_suggestions}
                  onChange={(e) => handleInputChange('improvement_suggestions', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  rows={3}
                  placeholder="Hoe kunnen we het beter maken?"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-2">
                  Aanvullende opmerkingen
                </label>
                <textarea
                  value={feedback.additional_comments}
                  onChange={(e) => handleInputChange('additional_comments', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  rows={3}
                  placeholder="Overige feedback..."
                />
              </div>
            </div>

            {/* Partnership Interest */}
            <div className="bg-blue-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Interesse in samenwerking
              </h3>
              
              <div className="mb-4">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={feedback.interested_in_partnership}
                    onChange={(e) => handleInputChange('interested_in_partnership', e.target.checked)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-gray-700 font-medium">
                    Ja, ik ben geïnteresseerd in een partnership met jullie
                  </span>
                </label>
              </div>

              {feedback.interested_in_partnership && (
                <div className="space-y-4 mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-medium text-gray-700 mb-2">
                        Hoe kunnen we contact opnemen?
                      </label>
                      <select
                        value={feedback.preferred_contact_method}
                        onChange={(e) => handleInputChange('preferred_contact_method', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      >
                        <option value="email">E-mail</option>
                        <option value="phone">Telefoon</option>
                        <option value="whatsapp">WhatsApp</option>
                        <option value="linkedin">LinkedIn</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-medium text-gray-700 mb-2">
                        Beste tijd om contact op te nemen
                      </label>
                      <input
                        type="text"
                        value={feedback.best_contact_time}
                        onChange={(e) => handleInputChange('best_contact_time', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        placeholder="Bijv. werkdagen 9-17u"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-medium text-gray-700 mb-2">
                        Huidige leverancier (indien van toepassing)
                      </label>
                      <input
                        type="text"
                        value={feedback.current_supplier}
                        onChange={(e) => handleInputChange('current_supplier', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        placeholder="Naam van je huidige leverancier"
                      />
                    </div>

                    <div>
                      <label className="block font-medium text-gray-700 mb-2">
                        Geschat maandvolume (aantal producten)
                      </label>
                      <input
                        type="number"
                        value={feedback.monthly_volume_estimate || ''}
                        onChange={(e) => handleInputChange('monthly_volume_estimate', e.target.value ? parseInt(e.target.value) : null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        placeholder="Bijv. 100"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={feedback.decision_maker}
                          onChange={(e) => handleInputChange('decision_maker', e.target.checked)}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-gray-700">
                          Ik ben beslissingsbevoegd voor inkoop
                        </span>
                      </label>
                    </div>

                    <div>
                      <label className="block font-medium text-gray-700 mb-2">
                        Wanneer wil je een beslissing nemen?
                      </label>
                      <select
                        value={feedback.decision_timeline}
                        onChange={(e) => handleInputChange('decision_timeline', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      >
                        <option value="immediate">Direct</option>
                        <option value="within_month">Binnen een maand</option>
                        <option value="within_quarter">Binnen dit kwartaal</option>
                        <option value="next_year">Volgend jaar</option>
                        <option value="unsure">Weet ik nog niet</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Follow-up Preference */}
            <div>
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={feedback.ready_for_follow_up}
                  onChange={(e) => handleInputChange('ready_for_follow_up', e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-gray-700">
                  Ik sta open voor follow-up communicatie
                </span>
              </label>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading || feedback.overall_rating === 0}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Send className="h-4 w-4" />
                )}
                <span>{loading ? 'Versturen...' : 'Feedback versturen'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Star Rating Component
function StarRating({ 
  rating, 
  onChange, 
  large = false 
}: { 
  rating: number; 
  onChange: (rating: number) => void; 
  large?: boolean;
}) {
  const size = large ? 'h-8 w-8' : 'h-5 w-5';
  
  return (
    <div className="flex space-x-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className={`${size} transition-colors ${
            star <= rating 
              ? 'text-yellow-400 hover:text-yellow-500' 
              : 'text-gray-300 hover:text-gray-400'
          }`}
        >
          <Star className={`${size} fill-current`} />
        </button>
      ))}
      {rating > 0 && (
        <span className={`ml-2 text-gray-600 ${large ? 'text-lg' : 'text-sm'}`}>
          {rating}/5
        </span>
      )}
    </div>
  );
} 