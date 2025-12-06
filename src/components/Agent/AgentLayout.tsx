import React from 'react';
import { Outlet } from 'react-router-dom';
import AgentHeader from './AgentHeader';

const AgentLayout: React.FC = () => {
  const agentName = (typeof window !== 'undefined' && localStorage.getItem('agentName')) || 'Agent';

  return (
    <div className="min-h-screen bg-gray-50">
      <AgentHeader agentName={agentName} />
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  );
};

export default AgentLayout;
