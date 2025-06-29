import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader2 } from 'lucide-react';
import Button from '../components/ui/button';
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
        <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
        <p className="text-foreground-muted max-w-2xl mx-auto">
          Select the perfect plan for your content creation needs
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {Object.entries(STRIPE_PRODUCTS).map(([key, product]) => (
          <div
            key={product.id}
            className="bg-background-light rounded-lg p-6 border-2 border-background-lighter hover:border-primary-500 transition-colors"
          >
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-2">{product.name}</h2>
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
                  <span>{feature}</span>
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