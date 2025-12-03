import { useState } from 'react';
import { Gift, Users, Copy, Share2, CheckCircle, Award, ArrowLeft } from 'lucide-react';

interface Referral {
  id: string;
  name: string;
  email: string;
  status: 'invited' | 'registered' | 'booked' | 'completed';
  rewardEarned: boolean;
}

interface Reward {
  id: string;
  title: string;
  description: string;
  points: number;
  earned: boolean;
  date?: string;
}

interface ReferralsAndRewardsProps {
  onBack?: () => void;
}

export function ReferralsAndRewards({ onBack }: ReferralsAndRewardsProps) {
  const [referrals] = useState<Referral[]>([
    {
      id: '1',
      name: 'Alex Johnson',
      email: 'alex@example.com',
      status: 'registered',
      rewardEarned: true
    },
    {
      id: '2',
      name: 'Maria Garcia',
      email: 'maria@example.com',
      status: 'booked',
      rewardEarned: false
    },
    {
      id: '3',
      name: 'David Wilson',
      email: 'david@example.com',
      status: 'invited',
      rewardEarned: false
    }
  ]);

  const [rewards] = useState<Reward[]>([
    {
      id: '1',
      title: 'First Referral Bonus',
      description: 'Earned for referring your first friend',
      points: 100,
      earned: true,
      date: '2023-06-15'
    },
    {
      id: '2',
      title: 'Five Friends Milestone',
      description: 'Earned for referring five friends',
      points: 500,
      earned: false,
      date: undefined
    },
    {
      id: '3',
      title: 'Service Discount',
      description: '15% off any service for referring three friends',
      points: 0,
      earned: true,
      date: '2023-05-20'
    }
  ]);

  const totalPoints = rewards.filter(r => r.earned).reduce((sum, reward) => sum + reward.points, 0);
  const pendingReferrals = referrals.filter(r => r.status !== 'registered' && r.status !== 'completed').length;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Referral link copied to clipboard!');
  };

  const shareReferralLink = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Join MyGarage',
        text: 'Get exclusive discounts on car services!',
        url: 'https://mygarage.example.com/referral/abc123'
      });
    } else {
      copyToClipboard('https://mygarage.example.com/referral/abc123');
    }
  };

  const getStatusText = (status: Referral['status']) => {
    switch (status) {
      case 'invited': return 'Invited';
      case 'registered': return 'Registered';
      case 'booked': return 'Booked Service';
      case 'completed': return 'Completed Service';
      default: return '';
    }
  };

  const getStatusColor = (status: Referral['status']) => {
    switch (status) {
      case 'invited': return 'bg-gray-100 text-gray-800';
      case 'registered': return 'bg-blue-100 text-blue-800';
      case 'booked': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      <div className="flex items-center mb-6">
        {onBack && (
          <button 
            onClick={onBack}
            className="mr-4 p-2 rounded-full hover:bg-gray-100"
            aria-label="Back to profile"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
        )}
        <h1 className="text-2xl font-bold text-gray-900">Referrals & Rewards</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Invite Friends, Earn Rewards</h2>
            <p className="text-slate-600 text-sm">
              Share your referral link and earn points for every friend who joins
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 border-b border-slate-200">
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-4 text-white">
            <div className="flex items-center">
              <Gift className="h-8 w-8 text-orange-200" />
              <div className="ml-3">
                <p className="text-orange-100">Total Points</p>
                <p className="text-2xl font-bold">{totalPoints}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-4 text-white">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-200" />
              <div className="ml-3">
                <p className="text-blue-100">Active Referrals</p>
                <p className="text-2xl font-bold">{referrals.filter(r => r.status !== 'invited').length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-4 text-white">
            <div className="flex items-center">
              <Award className="h-8 w-8 text-green-200" />
              <div className="ml-3">
                <p className="text-green-100">Pending Rewards</p>
                <p className="text-2xl font-bold">{pendingReferrals}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Referral Link */}
        <div className="px-6 py-5 border-b border-slate-200">
          <h3 className="text-md font-medium text-slate-900 mb-3">Share Your Referral Link</h3>
          <div className="flex">
            <input
              type="text"
              readOnly
              value="https://mygarage.example.com/referral/abc123"
              className="flex-1 min-w-0 px-4 py-2 border border-slate-300 rounded-l-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
            <button
              onClick={() => copyToClipboard('https://mygarage.example.com/referral/abc123')}
              className="inline-flex items-center px-4 py-2 border border-slate-300 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50"
            >
              <Copy className="h-4 w-4 mr-1" />
              Copy
            </button>
            <button
              onClick={shareReferralLink}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-r-lg shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700"
            >
              <Share2 className="h-4 w-4 mr-1" />
              Share
            </button>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            Earn 100 points for every friend who signs up and books their first service.
          </p>
        </div>

        {/* Referrals List */}
        <div className="px-6 py-5 border-b border-slate-200">
          <h3 className="text-md font-medium text-slate-900 mb-4">Your Referrals</h3>
          
          <div className="overflow-hidden border border-slate-200 rounded-lg">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Friend
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Reward
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {referrals.map((referral) => (
                  <tr key={referral.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900">{referral.name}</div>
                      <div className="text-sm text-slate-500">{referral.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(referral.status)}`}>
                        {getStatusText(referral.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {referral.rewardEarned ? (
                        <div className="flex items-center text-green-600">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Earned
                        </div>
                      ) : (
                        'Pending'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Rewards List */}
        <div className="px-6 py-5">
          <h3 className="text-md font-medium text-slate-900 mb-4">Available Rewards</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rewards.map((reward) => (
              <div 
                key={reward.id} 
                className={`border rounded-lg p-4 ${reward.earned ? 'border-green-200 bg-green-50' : 'border-slate-200'}`}
              >
                <div className="flex justify-between">
                  <h4 className="font-medium text-slate-900">{reward.title}</h4>
                  {reward.points > 0 && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                      {reward.points} pts
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-slate-600">{reward.description}</p>
                {reward.earned ? (
                  <div className="mt-3 flex items-center text-sm text-green-600">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Earned on {new Date(reward.date!).toLocaleDateString()}
                  </div>
                ) : (
                  <div className="mt-3 text-sm text-slate-500">
                    Not earned yet
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}