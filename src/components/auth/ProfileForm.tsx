import React, { useState, useEffect } from 'react';
import { User, Mail, Bell, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { z } from 'zod';
import Button from '../ui/button';
import { updateProfile, updateProfileSchema } from '../../lib/auth';
import { useAppStore } from '../../store';
import { Toast, ToastTitle, ToastDescription } from '../ui/toast';

const ProfileForm: React.FC = () => {
  const user = useAppStore((state) => state.user);
  const setUser = useAppStore((state) => state.setUser);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    notifications: {
      email: user?.notifications?.email ?? true,
      push: user?.notifications?.push ?? true,
    },
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        notifications: {
          email: user.notifications?.email ?? true,
          push: user.notifications?.push ?? true,
        },
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const validatedData = updateProfileSchema.parse(formData);
      const updatedUser = await updateProfile(validatedData);
      setUser(updatedUser);
      
      setShowToast(true);
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: string,
    subfield?: string
  ) => {
    if (subfield) {
      setFormData({
        ...formData,
        [field]: {
          ...formData[field as keyof typeof formData],
          [subfield]: e.target.type === 'checkbox' ? e.target.checked : e.target.value,
        },
      });
    } else {
      setFormData({
        ...formData,
        [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value,
      });
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Name</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground-muted" size={18} />
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange(e, 'name')}
              className="pl-10 pr-4 py-2 w-full bg-background-lighter border border-background-lighter rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="Enter your name"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground-muted" size={18} />
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleChange(e, 'email')}
              className="pl-10 pr-4 py-2 w-full bg-background-lighter border border-background-lighter rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="Enter your email"
            />
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium mb-4 flex items-center">
            <Bell size={18} className="mr-2 text-foreground-muted" />
            Notification Preferences
          </h3>
          
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.notifications.email}
                onChange={(e) => handleChange(e, 'notifications', 'email')}
                className="h-4 w-4 rounded border-gray-600 text-primary-600 focus:ring-primary-500"
              />
              <span className="ml-2 text-sm">Email notifications</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.notifications.push}
                onChange={(e) => handleChange(e, 'notifications', 'push')}
                className="h-4 w-4 rounded border-gray-600 text-primary-600 focus:ring-primary-500"
              />
              <span className="ml-2 text-sm">Push notifications</span>
            </label>
          </div>
        </div>

        {error && (
          <div className="flex items-center text-error-500 text-sm">
            <AlertCircle size={16} className="mr-2" />
            {error}
          </div>
        )}

        <Button
          type="submit"
          variant="primary"
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 size={16} className="animate-spin mr-2" />
              Saving Changes...
            </>
          ) : (
            <>
              <CheckCircle size={16} className="mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </form>

      {showToast && (
        <Toast open={showToast} onOpenChange={setShowToast}>
          <ToastTitle>Profile Updated</ToastTitle>
          <ToastDescription>
            Your profile changes have been saved successfully.
          </ToastDescription>
        </Toast>
      )}
    </div>
  );
};

export default ProfileForm;