import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import Button from '../components/ui/button';

const CheckoutSuccessPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect after 5 seconds
    const timeout = setTimeout(() => {
      navigate('/dashboard');
    }, 5000);

    return () => clearTimeout(timeout);
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center p-8">
        <div className="flex justify-center mb-6">
          <CheckCircle2 size={64} className="text-success-500" />
        </div>
        <h1 className="text-3xl font-bold mb-4">Payment Successful!</h1>
        <p className="text-foreground-muted mb-8">
          Thank you for your purchase. You will be redirected to your dashboard shortly.
        </p>
        <Button
          variant="primary"
          onClick={() => navigate('/dashboard')}
        >
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
};

export default CheckoutSuccessPage;