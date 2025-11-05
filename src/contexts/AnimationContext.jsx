import React, { createContext, useContext, useState, useEffect } from 'react';

const AnimationContext = createContext();

export const useAnimation = () => {
  const context = useContext(AnimationContext);
  if (!context) {
    throw new Error('useAnimation must be used within AnimationProvider');
  }
  return context;
};

export const AnimationProvider = ({ children }) => {
  const [lottieData, setLottieData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadAnimation = async () => {
      try {
        // Load from local public folder for consistent performance
        const response = await fetch('/icon-animation.json');
        if (!response.ok) {
          throw new Error('Failed to load animation');
        }
        const data = await response.json();
        setLottieData(data);
        setError(null);
      } catch (err) {
        console.error('Error loading Lottie animation:', err);
        setError(err);
        // Set empty object to prevent infinite loading
        setLottieData({});
      } finally {
        setIsLoading(false);
      }
    };

    loadAnimation();
  }, []);

  return (
    <AnimationContext.Provider value={{ lottieData, isLoading, error }}>
      {children}
    </AnimationContext.Provider>
  );
};
