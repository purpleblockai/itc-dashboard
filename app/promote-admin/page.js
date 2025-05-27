"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PromoteAdminPage() {
  const [userId, setUserId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');
    setError('');

    try {
      const response = await fetch('/api/promote-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to promote user');
      }

      setMessage(data.message);
      setUserId('');
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md p-6 bg-white rounded shadow-md dark:bg-gray-800">
        <h1 className="mb-6 text-2xl font-bold text-center">Promote User to Admin</h1>
        
        {message && (
          <div className="p-4 mb-4 text-green-700 bg-green-100 rounded dark:bg-green-900 dark:text-green-300">
            {message}
          </div>
        )}
        
        {error && (
          <div className="p-4 mb-4 text-red-700 bg-red-100 rounded dark:bg-red-900 dark:text-red-300">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block mb-2 text-sm font-bold">
              User ID
            </label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Enter user ID"
              className="w-full p-2 border rounded"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Enter the exact user ID (e.g., "admin")
            </p>
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full p-2 text-white bg-blue-500 rounded hover:bg-blue-600 disabled:bg-blue-300"
          >
            {isLoading ? 'Processing...' : 'Promote to Admin'}
          </button>
        </form>
        
        <div className="mt-4 text-center">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-blue-500 hover:underline"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
} 
