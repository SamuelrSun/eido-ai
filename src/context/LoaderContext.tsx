// src/context/LoaderContext.tsx
import React, { createContext, useContext, useRef, ReactNode } from 'react';
import LoadingBar, { LoadingBarRef } from 'react-top-loading-bar';
import { useNavigate } from 'react-router-dom';

interface LoaderContextType {
  loader: LoadingBarRef | null;
  loadPage: (path: string) => void;
}

const LoaderContext = createContext<LoaderContextType | null>(null);

export const usePageLoader = () => {
  const context = useContext(LoaderContext);
  if (!context) {
    throw new Error('usePageLoader must be used within a LoaderProvider');
  }
  return context;
};

interface LoaderProviderProps {
  children: ReactNode;
}

export const LoaderProvider = ({ children }: LoaderProviderProps) => {
  const loaderRef = useRef<LoadingBarRef>(null);
  const navigate = useNavigate();

  const loadPage = (path: string) => {
    if (loaderRef.current) {
      // Start the loading bar animation immediately
      loaderRef.current.continuousStart();
    }
    // MODIFICATION: The setTimeout wrapper is removed to navigate instantly.
    navigate(path);
  };

  return (
    <LoaderContext.Provider value={{ loader: loaderRef.current, loadPage }}>
      {/* The loading bar component remains */}
      <LoadingBar color='#F6F2E9' ref={loaderRef} shadow={true} height={3} />
      {children}
    </LoaderContext.Provider>
  );
};