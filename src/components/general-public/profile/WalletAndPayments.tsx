import { useState } from 'react';
import { CreditCard, Plus, Wallet, ArrowLeft, Receipt, TrendingUp } from 'lucide-react';

interface PaymentMethod {
  id: string;
  type: 'credit' | 'debit' | 'paypal';
  lastFour: string;
  expiryDate: string;
  isDefault: boolean;
}

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  status: 'completed' | 'pending' | 'failed';
}

interface WalletAndPaymentsProps {
  onBack?: () => void;
}

export function WalletAndPayments({ onBack }: WalletAndPaymentsProps) {
  const [activeTab, setActiveTab] = useState<'wallet' | 'paymentMethods' | 'transactions'>('wallet');
  const [showAddPayment, setShowAddPayment] = useState(false);

  // Mock data
  const paymentMethods: PaymentMethod[] = [
    { id: '1', type: 'credit', lastFour: '4242', expiryDate: '12/25', isDefault: true },
    { id: '2', type: 'debit', lastFour: '1234', expiryDate: '06/24', isDefault: false },
  ];

  const transactions: Transaction[] = [
    { id: '1', date: '2023-06-15', description: 'Oil Change Service', amount: 45.99, status: 'completed' },
    { id: '2', date: '2023-06-10', description: 'Tire Replacement', amount: 320.50, status: 'completed' },
    { id: '3', date: '2023-06-05', description: 'Brake Inspection', amount: 89.99, status: 'completed' },
    { id: '4', date: '2023-06-01', description: 'Engine Diagnostic', amount: 125.00, status: 'pending' },
  ];

  const walletBalance = 125.50;

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
        <h1 className="text-2xl font-bold text-gray-900">Wallet & Payments</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Tabs */}
        <div className="border-b border-slate-200">
          <nav className="flex px-6">
            <button
              onClick={() => setActiveTab('wallet')}
              className={`py-4 px-1 mr-8 text-sm font-medium border-b-2 ${
                activeTab === 'wallet'
                  ? 'border-orange-600 text-orange-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              Wallet
            </button>
            <button
              onClick={() => setActiveTab('paymentMethods')}
              className={`py-4 px-1 mr-8 text-sm font-medium border-b-2 ${
                activeTab === 'paymentMethods'
                  ? 'border-orange-600 text-orange-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              Payment Methods
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`py-4 px-1 text-sm font-medium border-b-2 ${
                activeTab === 'transactions'
                  ? 'border-orange-600 text-orange-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              Transactions
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Wallet Tab */}
          {activeTab === 'wallet' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-1">My Wallet</h2>
                <p className="text-slate-600 text-sm">
                  Manage your wallet balance and rewards
                </p>
              </div>

              <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-6 text-white">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-orange-100">Total Balance</p>
                    <p className="text-3xl font-bold mt-2">${walletBalance.toFixed(2)}</p>
                    <p className="text-orange-100 text-sm mt-1">Updated just now</p>
                  </div>
                  <Wallet className="h-12 w-12 text-orange-200" />
                </div>
                
                <div className="flex space-x-4 mt-6">
                  <button className="bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-lg text-sm font-medium transition">
                    Add Funds
                  </button>
                  <button className="bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-lg text-sm font-medium transition">
                    Transfer
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border border-slate-200 rounded-lg p-4">
                  <p className="text-slate-600 text-sm">Points Balance</p>
                  <p className="text-xl font-semibold mt-1">1,250 pts</p>
                </div>
                <div className="border border-slate-200 rounded-lg p-4">
                  <p className="text-slate-600 text-sm">Rewards</p>
                  <p className="text-xl font-semibold mt-1">3</p>
                </div>
                <div className="border border-slate-200 rounded-lg p-4">
                  <p className="text-slate-600 text-sm">Coupons</p>
                  <p className="text-xl font-semibold mt-1">2</p>
                </div>
              </div>
            </div>
          )}

          {/* Payment Methods Tab */}
          {activeTab === 'paymentMethods' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 mb-1">Payment Methods</h2>
                  <p className="text-slate-600 text-sm">
                    Manage your payment options
                  </p>
                </div>
                <button 
                  onClick={() => setShowAddPayment(true)}
                  className="inline-flex items-center px-3 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Payment Method
                </button>
              </div>

              <div className="space-y-4">
                {paymentMethods.map((method) => (
                  <div key={method.id} className="border border-slate-200 rounded-lg p-4 flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="bg-slate-100 p-3 rounded-lg mr-4">
                        <CreditCard className="h-6 w-6 text-slate-600" />
                      </div>
                      <div>
                        <div className="flex items-center">
                          <p className="font-medium text-slate-900">
                            {method.type === 'credit' ? 'Credit Card' : method.type === 'debit' ? 'Debit Card' : 'PayPal'}
                          </p>
                          {method.isDefault && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-slate-600 text-sm">
                          {method.type !== 'paypal' ? `•••• •••• •••• ${method.lastFour}` : 'PayPal Account'}
                        </p>
                        {method.type !== 'paypal' && (
                          <p className="text-slate-500 text-xs mt-1">Expires {method.expiryDate}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      {!method.isDefault && (
                        <button className="text-sm font-medium text-orange-600 hover:text-orange-700">
                          Make Default
                        </button>
                      )}
                      <button className="text-sm font-medium text-slate-600 hover:text-slate-900">
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {showAddPayment && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                  <div className="bg-white rounded-xl max-w-md w-full p-6">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Add Payment Method</h3>
                    
                    <form className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Card Number
                        </label>
                        <input
                          type="text"
                          placeholder="1234 5678 9012 3456"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Expiry Date
                          </label>
                          <input
                            type="text"
                            placeholder="MM/YY"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            CVV
                          </label>
                          <input
                            type="text"
                            placeholder="123"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Name on Card
                        </label>
                        <input
                          type="text"
                          placeholder="John Doe"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        />
                      </div>
                      
                      <div className="flex justify-end space-x-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setShowAddPayment(false)}
                          className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700"
                        >
                          Add Card
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Transactions Tab */}
          {activeTab === 'transactions' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-1">Transaction History</h2>
                <p className="text-slate-600 text-sm">
                  View your recent transactions
                </p>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {transactions.map((transaction) => (
                      <tr key={transaction.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                          {new Date(transaction.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                          <div className="flex items-center">
                            <Receipt className="h-4 w-4 text-slate-400 mr-2" />
                            {transaction.description}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                          ${transaction.amount.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            transaction.status === 'completed' 
                              ? 'bg-green-100 text-green-800' 
                              : transaction.status === 'pending' 
                                ? 'bg-yellow-100 text-yellow-800' 
                                : 'bg-red-100 text-red-800'
                          }`}>
                            {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}