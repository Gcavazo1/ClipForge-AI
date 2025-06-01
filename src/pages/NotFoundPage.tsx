import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import Button from '../components/ui/button';

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();
  
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-var(--nav-height)*2)] py-16 text-center px-4">
      <div className="text-6xl font-bold mb-4 text-primary-600">404</div>
      <h1 className="text-2xl font-bold mb-6">Page Not Found</h1>
      <p className="text-foreground-muted max-w-md mb-8">
        The page you are looking for doesn't exist or has been moved.
      </p>
      
      <div className="flex flex-col sm:flex-row gap-4">
        <Button 
          variant="outline" 
          onClick={() => navigate(-1)}
          icon={<ArrowLeft size={16} />}
        >
          Go Back
        </Button>
        <Button 
          variant="primary" 
          onClick={() => navigate('/')}
          icon={<Home size={16} />}
        >
          Back to Home
        </Button>
      </div>
    </div>
  );
};

export default NotFoundPage;