import React from 'react';
import { useNavigate } from 'react-router-dom';
import { XCircle } from 'lucide-react';
import Button from '../components/ui/button';

const CheckoutCancelPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center p-8">
        <div className="flex justify-center mb-6">
          <XCircle size={64} className="text-error-500" />
        </div>
        <h1 className="text-3xl font-bold mb-4">Payment Cancelled</h1>
        <p className="text-foreground-muted mb-8">
          Your payment was cancelled. No charges were made.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            variant="outline"
            onClick={() => navigate(-2)}
          >
            Try Again
          </Button>
          <Button
            variant="primary"
            onClick={() => navigate('/dashboard')}
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CheckoutCancelPage;