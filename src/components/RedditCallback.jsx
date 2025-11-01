import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { handleRedditCallback } from '../lib/reddit';

/**
 * Reddit OAuth callback handler
 * This page receives the OAuth code from Reddit and exchanges it for tokens
 */
const RedditCallback = () => {
  const [status, setStatus] = useState('Processing...');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const processCallback = async () => {
      try {
        // Get code and state from URL params
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const state = params.get('state');
        const error = params.get('error');

        if (error) {
          throw new Error(`Reddit authorization failed: ${error}`);
        }

        if (!code || !state) {
          throw new Error('Missing authorization code or state');
        }

        setStatus('Connecting to Reddit...');
        await handleRedditCallback(code, state);

        // Redirect back to main page immediately
        navigate('/');

      } catch (err) {
        console.error('Reddit callback error:', err);
        setError(err.message);
        setStatus('Authentication failed');
      }
    };

    processCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center">
        <div className="mb-4">
          {error ? (
            <div className="text-red-500 text-6xl mb-4">✗</div>
          ) : (
            <div className="animate-spin text-6xl mb-4">⟳</div>
          )}
        </div>
        <h1 className="text-2xl font-bold mb-2">{status}</h1>
        {error && (
          <div className="mt-4">
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition"
            >
              Return to Home
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RedditCallback;
