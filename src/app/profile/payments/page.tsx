import { useState } from 'react';
import { CreditCard, Plus, Trash2, Edit3, CheckCircle, AlertCircle } from 'lucide-react';

interface PaymentMethod {
  id: string;
  type: 'credit' | 'debit' | 'mobile_money';
  brand: string;
  last4: string;
  expiryMonth: string;
  expiryYear: string;
  isDefault: boolean;
  nameOnCard?: string;
  mobileMoneyProvider?: string;
  phoneNumber?: string;
}

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  status: 'completed' | 'pending' | 'failed';
  type: 'payment' | 'refund' | 'transfer';
}

function Payments() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([
    {
      id: '1',
      type: 'credit',
      brand: 'Visa',
      last4: '4242',
      expiryMonth: '12',
      expiryYear: '25',
      isDefault: true,
      nameOnCard: 'John Doe'
    },
    {
      id: '2',
      type: 'mobile_money',
      brand: 'M-Pesa',
      last4: '4567',
      expiryMonth: '',
      expiryYear: '',
      isDefault: false,
      mobileMoneyProvider: 'Safaricom',
      phoneNumber: '+254712345678'
    }
  ]);

  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: '1001',
      date: '2025-10-15',
      description: 'Oil Change Service at AutoCare Garage',
      amount: 85.50,
      status: 'completed',
      type: 'payment'
    },
    {
      id: '1002',
      date: '2025-10-10',
      description: 'Brake Pad Replacement',
      amount: 150.00,
      status: 'completed',
      type: 'payment'
    },
    {
      id: '1003',
      date: '2025-10-05',
      description: 'Engine Diagnostic Service',
      amount: 120.75,
      status: 'completed',
      type: 'payment'
    },
    {
      id: '1004',
      date: '2025-09-28',
      description: 'Tire Rotation Service',
      amount: 65.00,
      status: 'completed',
      type: 'payment'
    }
  ]);

  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [newPaymentMethod, setNewPaymentMethod] = useState({
    type: 'credit',
    brand: '',
    number: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    nameOnCard: '',
    mobileMoneyProvider: '',
    phoneNumber: ''
  });

  const handleDeletePaymentMethod = (id: string) => {
    setPaymentMethods(paymentMethods.filter(method => method.id !== id));
  };

  const handleSetDefault = (id: string) => {
    setPaymentMethods(paymentMethods.map(method => ({
      ...method,
      isDefault: method.id === id
    })));
  };

  const handleAddPaymentMethod = () => {
    // In a real app, this would connect to a payment processor
    setShowAddPaymentModal(false);
    
    // Reset form
    setNewPaymentMethod({
      type: 'credit',
      brand: '',
      number: '',
      expiryMonth: '',
      expiryYear: '',
      cvv: '',
      nameOnCard: '',
      mobileMoneyProvider: '',
      phoneNumber: ''
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Payments & Wallet</h1>
          <p className="text-gray-600 mt-1">Manage your payment methods and view transaction history</p>
        </div>
        <button 
          onClick={() => setShowAddPaymentModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Add Payment Method</span>
        </button>
      </div>

      {/* Balance Summary Card */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-6 mb-8 text-white">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-lg font-medium opacity-90">Available Balance</h2>
            <p className="text-3xl font-bold mt-2">$245.80</p>
            <p className="opacity-90 mt-1">Updated just now</p>
          </div>
          <div className="bg-white bg-opacity-20 rounded-lg p-3">
            <CreditCard className="w-8 h-8" />
          </div>
        </div>
        <div className="flex gap-4 mt-6">
          <button className="bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-lg transition-colors">
            Add Funds
          </button>
          <button className="bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-lg transition-colors">
            Withdraw
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Payment Methods Section */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Payment Methods</h2>
          
          {paymentMethods.length === 0 ? (
            <div className="border border-dashed border-gray-300 rounded-lg p-8 text-center">
              <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No payment methods</h3>
              <p className="text-gray-500 mb-4">Add a payment method to get started</p>
              <button 
                onClick={() => setShowAddPaymentModal(true)}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Add Payment Method
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {paymentMethods.map((method) => (
                <div key={method.id} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="flex items-start gap-4">
                      <div className="bg-gray-100 rounded-lg p-3">
                        <CreditCard className="w-6 h-6 text-gray-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-gray-900">
                            {method.type === 'mobile_money' 
                              ? `${method.mobileMoneyProvider} (${method.phoneNumber})` 
                              : `${method.brand} ending in ${method.last4}`}
                          </h3>
                          {method.isDefault && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Default
                            </span>
                          )}
                        </div>
                        
                        {method.type === 'credit' || method.type === 'debit' ? (
                          <p className="text-gray-500 text-sm mt-1">
                            Expires {method.expiryMonth}/{method.expiryYear}
                          </p>
                        ) : (
                          <p className="text-gray-500 text-sm mt-1">
                            Mobile Money Account
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      {!method.isDefault && (
                        <button 
                          onClick={() => handleSetDefault(method.id)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Set as Default
                        </button>
                      )}
                      <button 
                        onClick={() => handleDeletePaymentMethod(method.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Transactions */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Recent Transactions</h2>
            <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              View All
            </button>
          </div>
          
          {transactions.length === 0 ? (
            <div className="border border-dashed border-gray-300 rounded-lg p-8 text-center">
              <div className="bg-gray-100 rounded-full p-3 w-12 h-12 mx-auto mb-4 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">No transactions yet</h3>
              <p className="text-gray-500">Your transaction history will appear here</p>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg divide-y divide-gray-200">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="p-4">
                  <div className="flex justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">{transaction.description}</h3>
                      <p className="text-gray-500 text-sm">{transaction.date}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-medium ${
                        transaction.type === 'refund' ? 'text-green-600' : 'text-gray-900'
                      }`}>
                        {transaction.type === 'refund' ? '+' : '-'}${transaction.amount.toFixed(2)}
                      </p>
                      <div className="flex items-center justify-end mt-1">
                        {transaction.status === 'completed' ? (
                          <span className="inline-flex items-center text-green-600 text-sm">
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Completed
                          </span>
                        ) : transaction.status === 'pending' ? (
                          <span className="inline-flex items-center text-yellow-600 text-sm">
                            <AlertCircle className="w-4 h-4 mr-1" />
                            Pending
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-red-600 text-sm">
                            <AlertCircle className="w-4 h-4 mr-1" />
                            Failed
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Payment Method Modal */}
      {showAddPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-gray-900">Add Payment Method</h3>
                <button 
                  onClick={() => setShowAddPaymentModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  ×
                </button>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    className={`p-3 rounded-lg border ${
                      newPaymentMethod.type === 'credit' 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    onClick={() => setNewPaymentMethod({...newPaymentMethod, type: 'credit'})}
                  >
                    Credit/Debit Card
                  </button>
                  <button
                    className={`p-3 rounded-lg border ${
                      newPaymentMethod.type === 'mobile_money' 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    onClick={() => setNewPaymentMethod({...newPaymentMethod, type: 'mobile_money'})}
                  >
                    Mobile Money
                  </button>
                </div>
              </div>
              
              {newPaymentMethod.type === 'credit' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Card Number</label>
                    <input
                      type="text"
                      placeholder="1234 5678 9012 3456"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={newPaymentMethod.number}
                      onChange={(e) => setNewPaymentMethod({...newPaymentMethod, number: e.target.value})}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="MM"
                          maxLength={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          value={newPaymentMethod.expiryMonth}
                          onChange={(e) => setNewPaymentMethod({...newPaymentMethod, expiryMonth: e.target.value})}
                        />
                        <input
                          type="text"
                          placeholder="YY"
                          maxLength={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          value={newPaymentMethod.expiryYear}
                          onChange={(e) => setNewPaymentMethod({...newPaymentMethod, expiryYear: e.target.value})}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">CVV</label>
                      <input
                        type="text"
                        placeholder="123"
                        maxLength={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={newPaymentMethod.cvv}
                        onChange={(e) => setNewPaymentMethod({...newPaymentMethod, cvv: e.target.value})}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name on Card</label>
                    <input
                      type="text"
                      placeholder="John Doe"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={newPaymentMethod.nameOnCard}
                      onChange={(e) => setNewPaymentMethod({...newPaymentMethod, nameOnCard: e.target.value})}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Money Provider</label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={newPaymentMethod.mobileMoneyProvider}
                      onChange={(e) => setNewPaymentMethod({...newPaymentMethod, mobileMoneyProvider: e.target.value})}
                    >
                      <option value="">Select provider</option>
                      <option value="M-Pesa">M-Pesa</option>
                      <option value="Airtel Money">Airtel Money</option>
                      <option value="T-Kash">T-Kash</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      placeholder="+254712345678"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={newPaymentMethod.phoneNumber}
                      onChange={(e) => setNewPaymentMethod({...newPaymentMethod, phoneNumber: e.target.value})}
                    />
                  </div>
                </div>
              )}
              
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setShowAddPaymentModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddPaymentMethod}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Add Payment Method
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Payments;