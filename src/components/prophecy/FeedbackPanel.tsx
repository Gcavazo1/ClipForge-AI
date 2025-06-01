import React, { useState } from 'react';
import { Star, ThumbsUp, ThumbsDown, Send, AlertCircle } from 'lucide-react';
import Button from '../ui/button';
import { submitFeedback } from '../../lib/feedback';
import { ProphecyResult } from '../../types';
import { Toast, ToastTitle, ToastDescription } from '../ui/toast';

interface FeedbackPanelProps {
  prophecyId: string;
  prophecy: ProphecyResult;
  onFeedbackSubmit?: () => void;
}

const FeedbackPanel: React.FC<FeedbackPanelProps> = ({
  prophecyId,
  prophecy,
  onFeedbackSubmit
}) => {
  const [rating, setRating] = useState<number>(0);
  const [wasHelpful, setWasHelpful] = useState<boolean | null>(null);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (wasHelpful === null) {
      setError('Please indicate if the prediction was helpful');
      return;
    }

    if (rating === 0) {
      setError('Please provide a rating');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await submitFeedback({
        userId: 'user1', // Replace with actual user ID from auth
        prophecyId,
        rating,
        wasHelpful,
        comment: comment.trim() || undefined,
        metadata: {
          followedRecommendations: true, // This would be determined by actual user actions
          predictedViews: prophecy.predictedViews,
          predictedLikes: prophecy.predictedLikes,
          predictedComments: prophecy.predictedComments
        }
      });

      setShowToast(true);
      if (onFeedbackSubmit) {
        onFeedbackSubmit();
      }

      // Reset form
      setRating(0);
      setWasHelpful(null);
      setComment('');
    } catch (err) {
      setError('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-background-light rounded-lg p-6">
      <h3 className="text-lg font-medium mb-4">Rate this Prophecy</h3>

      {/* Star Rating */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Rating</label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              onClick={() => setRating(value)}
              className={`p-2 rounded-full transition-colors ${
                value <= rating
                  ? 'text-warning-400 hover:text-warning-500'
                  : 'text-foreground-muted hover:text-foreground'
              }`}
            >
              <Star size={20} fill={value <= rating ? 'currentColor' : 'none'} />
            </button>
          ))}
        </div>
      </div>

      {/* Helpful Buttons */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Was this prediction helpful?</label>
        <div className="flex gap-3">
          <Button
            variant={wasHelpful === true ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setWasHelpful(true)}
            icon={<ThumbsUp size={16} />}
          >
            Yes
          </Button>
          <Button
            variant={wasHelpful === false ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setWasHelpful(false)}
            icon={<ThumbsDown size={16} />}
          >
            No
          </Button>
        </div>
      </div>

      {/* Comment Field */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Additional Comments (Optional)</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share your thoughts about this prediction..."
          className="w-full px-3 py-2 bg-background border border-background-lighter rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 h-24 resize-none"
        />
      </div>

      {error && (
        <div className="mb-4 text-sm text-error-500 flex items-center">
          <AlertCircle size={16} className="mr-2" />
          {error}
        </div>
      )}

      <Button
        variant="primary"
        onClick={handleSubmit}
        disabled={isSubmitting}
        className="w-full"
        icon={<Send size={16} />}
      >
        {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
      </Button>

      {showToast && (
        <Toast open={showToast} onOpenChange={setShowToast}>
          <ToastTitle>Feedback Submitted</ToastTitle>
          <ToastDescription>
            Thank you for helping us improve our predictions!
          </ToastDescription>
        </Toast>
      )}
    </div>
  );
};

export default FeedbackPanel;