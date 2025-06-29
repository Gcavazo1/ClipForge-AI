import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader2 } from 'lucide-react';
import Button from '../components/ui/button';
import MagicText from '../components/ui/magic-text';
import { STRIPE_PRODUCTS } from '../stripe-config';
import { createCheckoutSession } from '../lib/stripe';
import { useAppStore } from '../store';
import { Toast, ToastTitle, ToastDescription } from '../components/ui/toast';

const PricingPage: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const user = useAppStore((state) => state.user);
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);

  const handlePurchase = async (priceId: string, mode: 'payment' | 'subscription') => {
    if (!isAuthenticated) {
      navigate('/signin');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const checkoutUrl = await createCheckoutSession(priceId, mode);
      window.location.href = checkoutUrl;
    } catch (err) {
      console.error('Checkout error:', err);
      setError('Failed to start checkout process. Please try again.');
      setShowToast(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-16 px-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">
          Choose Your <MagicText>Perfect Plan</MagicText>
        </h1>
        <p className="text-foreground-muted max-w-2xl mx-auto">
          Select the perfect plan for your content creation needs and unlock the full power of AI-driven video editing
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {Object.entries(STRIPE_PRODUCTS).map(([key, product]) => (
          <div
            key={product.id}
            className={`bg-background-light rounded-lg p-6 border-2 transition-all duration-300 hover:scale-105 ${
              key === 'PRO' 
                ? 'border-primary-500 shadow-lg shadow-primary-500/20' 
                : 'border-background-lighter hover:border-primary-500'
            }`}
          >
            {key === 'PRO' && (
              <div className="text-center mb-4">
                <span className="bg-primary-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                  Most Popular
                </span>
              </div>
            )}

            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-2">
                {key === 'PRO' ? (
                  <MagicText>{product.name}</MagicText>
                ) : (
                  product.name
                )}
              </h2>
              <p className="text-foreground-muted mb-4">{product.description}</p>
              <div className="text-3xl font-bold">
                {key === 'FREE' ? (
                  'Free'
                ) : (
                  <>
                    $12<span className="text-lg text-foreground-muted">/month</span>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-3 mb-8">
              {product.features.map((feature, index) => (
                <div key={index} className="flex items-start gap-2">
                  <CheckCircle2 size={18} className="text-primary-500 mt-0.5 shrink-0" />
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>

            <Button
              variant={key === 'PRO' ? 'primary' : 'outline'}
              className="w-full"
              onClick={() => handlePurchase(product.priceId, product.mode)}
              disabled={isLoading || (user?.plan === key)}
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin mr-2" />
                  Processing...
                </>
              ) : user?.plan === key ? (
                'Current Plan'
              ) : (
                `Get ${product.name}`
              )}
            </Button>
          </div>
        ))}
      </div>

      {/* Feature Comparison */}
      <div className="mt-16 bg-background-light rounded-lg p-8">
        <h3 className="text-2xl font-bold text-center mb-8">
          Why Choose <MagicText>ClipForge Pro</MagicText>?
        </h3>
        
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🚀</span>
            </div>
            <h4 className="font-semibold mb-2">Unlimited Creation</h4>
            <p className="text-sm text-foreground-muted">
              Create unlimited clips without monthly restrictions. Perfect for content creators and businesses.
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🎯</span>
            </div>
            <h4 className="font-semibold mb-2">Prophetic Mode</h4>
            <p className="text-sm text-foreground-muted">
              AI-powered predictions to optimize your content strategy and maximize engagement.
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">💎</span>
            </div>
            <h4 className="font-semibold mb-2">Premium Quality</h4>
            <p className="text-sm text-foreground-muted">
              Export in 1080p resolution with no watermarks for professional-grade content.
            </p>
          </div>
        </div>
      </div>

      {showToast && error && (
        <Toast open={showToast} onOpenChange={setShowToast}>
          <ToastTitle>Error</ToastTitle>
          <ToastDescription>{error}</ToastDescription>
        </Toast>
      )}
    </div>
  );
};

export default PricingPage;