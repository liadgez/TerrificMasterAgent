'use client';

import { useState } from 'react';

export default function Home() {
  const [command, setCommand] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim()) return;

    setIsExecuting(true);
    try {
      const response = await fetch('/api/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ command }),
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('Task queued:', result);
        setCommand('');
      } else {
        console.error('Command failed:', result.error);
        alert(`Command failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Error executing command:', error);
      alert('Failed to execute command');
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-blue-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            OmniTask
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Your AI-powered personal assistant for web and macOS automation
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 mb-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="command" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Natural Language Command
              </label>
              <textarea
                id="command"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder="e.g., 'Search for laptops on Amazon under $1000' or 'Open Spotify and play my workout playlist'"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none h-24 dark:bg-gray-700 dark:text-white"
                disabled={isExecuting}
              />
            </div>
            <button
              type="submit"
              disabled={!command.trim() || isExecuting}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200"
            >
              {isExecuting ? 'Executing...' : 'Execute Command'}
            </button>
          </form>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Web Automation</h3>
            <ul className="space-y-2 text-gray-600 dark:text-gray-300">
              <li>• Online shopping</li>
              <li>• Form filling</li>
              <li>• Data extraction</li>
              <li>• Social media tasks</li>
            </ul>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">macOS Automation</h3>
            <ul className="space-y-2 text-gray-600 dark:text-gray-300">
              <li>• File operations</li>
              <li>• App control</li>
              <li>• System tasks</li>
              <li>• Notifications</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
