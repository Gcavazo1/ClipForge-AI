import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Settings, Wifi, WifiOff, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import Button from '../components/ui/button';
import { AIServiceIntegration } from '../lib/ai/ai-service-integration';
import { aiService } from '../lib/ai/ai-service';
import { Toast, ToastTitle, ToastDescription } from '../components/ui/toast';

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [serviceStatus, setServiceStatus] = useState<any>(null);
  const [providerHealth, setProviderHealth] = useState<any>(null);
  const [isTestingConnectivity, setIsTestingConnectivity] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState({ title: '', description: '' });

  useEffect(() => {
    checkServiceStatus();
    checkProviderHealth();
  }, []);

  const checkServiceStatus = async () => {
    try {
      const status = AIServiceIntegration.getServiceStatus();
      setServiceStatus(status);
    } catch (error) {
      console.error('Failed to check service status:', error);
    }
  };

  const checkProviderHealth = async () => {
    try {
      const health = await aiService.getProviderHealth();
      setProviderHealth(health);
    } catch (error) {
      console.error('Failed to check provider health:', error);
    }
  };

  const testConnectivity = async () => {
    setIsTestingConnectivity(true);
    try {
      const results = await AIServiceIntegration.testConnectivity();
      
      const successCount = Object.values(results).filter(Boolean).length - 1; // Subtract errors object
      const totalProviders = Object.keys(results).length - 1; // Subtract errors object
      
      setToastMessage({
        title: 'Connectivity Test Complete',
        description: `${successCount}/${totalProviders} providers are working correctly.`
      });
      setShowToast(true);
      
      // Refresh health status
      await checkProviderHealth();
    } catch (error) {
      setToastMessage({
        title: 'Connectivity Test Failed',
        description: 'Unable to test provider connectivity. Please try again.'
      });
      setShowToast(true);
    } finally {
      setIsTestingConnectivity(false);
    }
  };

  const getProviderStatusIcon = (providerName: string) => {
    if (!providerHealth || !providerHealth[providerName]) {
      return <AlertCircle size={16} className="text-foreground-muted" />;
    }
    
    return providerHealth[providerName].available 
      ? <CheckCircle size={16} className="text-success-500" />
      : <AlertCircle size={16} className="text-error-500" />;
  };

  const getProviderStatusText = (providerName: string) => {
    if (!providerHealth || !providerHealth[providerName]) {
      return 'Unknown';
    }
    
    const provider = providerHealth[providerName];
    return provider.available ? 'Connected' : `Error: ${provider.error || 'Connection failed'}`;
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center mb-8">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          icon={<ArrowLeft size={18} />}
          className="mr-4"
        />
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-foreground-muted">Manage your ClipForge AI configuration</p>
        </div>
      </div>

      <div className="space-y-8">
        {/* AI Services Configuration */}
        <div className="bg-background-light rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <Settings size={20} className="text-primary-500 mr-2" />
              <h2 className="text-lg font-medium">AI Services</h2>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={testConnectivity}
              disabled={isTestingConnectivity}
              icon={isTestingConnectivity ? <RefreshCw size={16} className="animate-spin" /> : <Wifi size={16} />}
            >
              {isTestingConnectivity ? 'Testing...' : 'Test Connectivity'}
            </Button>
          </div>

          {/* Overall Status */}
          <div className={`p-4 rounded-lg mb-6 ${
            serviceStatus?.available 
              ? 'bg-success-900/20 text-success-500' 
              : 'bg-error-900/20 text-error-500'
          }`}>
            <div className="flex items-center">
              {serviceStatus?.available ? (
                <Wifi size={20} className="mr-2" />
              ) : (
                <WifiOff size={20} className="mr-2" />
              )}
              <div>
                <p className="font-medium">
                  {serviceStatus?.available 
                    ? `AI Services Active (${serviceStatus.providers.length} providers)` 
                    : 'AI Services Unavailable'
                  }
                </p>
                <p className="text-sm opacity-90">
                  {serviceStatus?.available 
                    ? 'All AI features are working correctly'
                    : 'Please check your API key configuration'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Provider Status */}
          <div className="space-y-4">
            <h3 className="font-medium">Provider Status</h3>
            
            <div className="grid gap-4">
              {/* OpenAI */}
              <div className="flex items-center justify-between p-4 bg-background rounded-lg">
                <div className="flex items-center">
                  {getProviderStatusIcon('openai')}
                  <div className="ml-3">
                    <p className="font-medium">OpenAI</p>
                    <p className="text-sm text-foreground-muted">Whisper transcription & GPT analysis</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{getProviderStatusText('openai')}</p>
                  <p className="text-xs text-foreground-muted">Primary transcription</p>
                </div>
              </div>

              {/* Groq */}
              <div className="flex items-center justify-between p-4 bg-background rounded-lg">
                <div className="flex items-center">
                  {getProviderStatusIcon('groq')}
                  <div className="ml-3">
                    <p className="font-medium">Groq</p>
                    <p className="text-sm text-foreground-muted">Fast AI analysis & highlight detection</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{getProviderStatusText('groq')}</p>
                  <p className="text-xs text-foreground-muted">Primary analysis</p>
                </div>
              </div>

              {/* AssemblyAI */}
              <div className="flex items-center justify-between p-4 bg-background rounded-lg">
                <div className="flex items-center">
                  {getProviderStatusIcon('assembly')}
                  <div className="ml-3">
                    <p className="font-medium">AssemblyAI</p>
                    <p className="text-sm text-foreground-muted">Alternative transcription with speaker detection</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{getProviderStatusText('assembly')}</p>
                  <p className="text-xs text-foreground-muted">Backup transcription</p>
                </div>
              </div>
            </div>
          </div>

          {/* Configuration Help */}
          <div className="mt-6 p-4 bg-background rounded-lg">
            <h4 className="font-medium mb-2">Configuration</h4>
            <div className="text-sm text-foreground-muted space-y-2">
              <p>• API keys are configured via environment variables</p>
              <p>• OpenAI: VITE_OPENAI_API_KEY (required for transcription)</p>
              <p>• Groq: VITE_GROQ_API_KEY (recommended for fast analysis)</p>
              <p>• AssemblyAI: VITE_ASSEMBLY_API_KEY (optional backup)</p>
              <p>• Restart the application after updating API keys</p>
            </div>
          </div>
        </div>

        {/* Service Capabilities */}
        {serviceStatus?.capabilities && (
          <div className="bg-background-light rounded-lg p-6">
            <h2 className="text-lg font-medium mb-4">Available Capabilities</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`p-4 rounded-lg ${
                serviceStatus.capabilities.transcription 
                  ? 'bg-success-900/20 text-success-500' 
                  : 'bg-error-900/20 text-error-500'
              }`}>
                <p className="font-medium">Transcription</p>
                <p className="text-sm opacity-90">
                  {serviceStatus.capabilities.transcription ? 'Available' : 'Unavailable'}
                </p>
              </div>
              
              <div className={`p-4 rounded-lg ${
                serviceStatus.capabilities.textAnalysis 
                  ? 'bg-success-900/20 text-success-500' 
                  : 'bg-error-900/20 text-error-500'
              }`}>
                <p className="font-medium">Text Analysis</p>
                <p className="text-sm opacity-90">
                  {serviceStatus.capabilities.textAnalysis ? 'Available' : 'Unavailable'}
                </p>
              </div>
              
              <div className={`p-4 rounded-lg ${
                serviceStatus.capabilities.highlightDetection 
                  ? 'bg-success-900/20 text-success-500' 
                  : 'bg-error-900/20 text-error-500'
              }`}>
                <p className="font-medium">Highlight Detection</p>
                <p className="text-sm opacity-90">
                  {serviceStatus.capabilities.highlightDetection ? 'Available' : 'Unavailable'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {showToast && (
        <Toast open={showToast} onOpenChange={setShowToast}>
          <ToastTitle>{toastMessage.title}</ToastTitle>
          <ToastDescription>{toastMessage.description}</ToastDescription>
        </Toast>
      )}
    </div>
  );
};

export default SettingsPage;