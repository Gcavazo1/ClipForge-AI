import React from 'react';
import { User, CreditCard, Package, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/button';
import ProfileForm from '../components/auth/ProfileForm';
import { useAppStore } from '../store';

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAppStore((state) => state.user);

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="flex items-center mb-8">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          icon={<ArrowLeft size={18} />}
          className="mr-4"
        />
        <div>
          <h1 className="text-2xl font-bold">Account Settings</h1>
          <p className="text-foreground-muted">Manage your account preferences</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="space-y-6">
          <div className="bg-background-light p-6 rounded-lg">
            <div className="flex items-center mb-4">
              <User size={20} className="text-primary-500 mr-2" />
              <h2 className="text-lg font-medium">Profile</h2>
            </div>
            <div className="space-y-2 text-sm text-foreground-muted">
              <p>{user?.name}</p>
              <p>{user?.email}</p>
              <p>Member since {new Date(user?.createdAt || Date.now()).toLocaleDateString()}</p>
            </div>
          </div>

          <div className="bg-background-light p-6 rounded-lg">
            <div className="flex items-center mb-4">
              <Package size={20} className="text-primary-500 mr-2" />
              <h2 className="text-lg font-medium">Current Plan</h2>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Free Plan</p>
              <ul className="text-sm text-foreground-muted space-y-1">
                <li>5 projects per month</li>
                <li>Basic analytics</li>
                <li>Standard support</li>
              </ul>
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-4"
                onClick={() => navigate('/pricing')}
              >
                Upgrade Plan
              </Button>
            </div>
          </div>

          <div className="bg-background-light p-6 rounded-lg">
            <div className="flex items-center mb-4">
              <CreditCard size={20} className="text-primary-500 mr-2" />
              <h2 className="text-lg font-medium">Billing</h2>
            </div>
            <div className="space-y-2 text-sm text-foreground-muted">
              <p>No active subscriptions</p>
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-4"
                onClick={() => navigate('/billing')}
              >
                Manage Billing
              </Button>
            </div>
          </div>
        </div>

        <div className="md:col-span-2">
          <div className="bg-background-light p-6 rounded-lg">
            <h2 className="text-lg font-medium mb-6">Edit Profile</h2>
            <ProfileForm />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;