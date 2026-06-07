// hooks/useTerminalPolling.js
import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

const NODE_BACKEND_URL = process.env.REACT_APP_BACKEND_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000');

const useTerminalPolling = ({ 
  examId, 
  sessionId, 
  onExamDistributed, 
  onExamStarted, 
  onExamFinished,
  onDisplayQuestion,
  pollingInterval = 3000, // 3 secondes
  maxRetries = 5
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEventId, setLastEventId] = useState(null);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  
  const pollingRef = useRef(null);
  const abortControllerRef = useRef(null);
  const mountedRef = useRef(true);

  // Fonction pour récupérer l'état du terminal
  const fetchTerminalState = useCallback(async () => {
    if (!mountedRef.current) return;

    try {
      abortControllerRef.current = new AbortController();
      
      const response = await axios.get(
        `${NODE_BACKEND_URL}/api/terminal/state/${sessionId}`,
        { 
          signal: abortControllerRef.current.signal,
          params: { lastEventId }
        }
      );

      if (!mountedRef.current) return;

      const data = response.data;
      
      // Mettre à jour le dernier eventId
      if (data.eventId) {
        setLastEventId(data.eventId);
      }

      // Traiter les événements
      if (data.event === 'examDistributed') {
        onExamDistributed?.(data.payload);
      } else if (data.event === 'examStarted') {
        onExamStarted?.(data.payload);
      } else if (data.event === 'examFinished') {
        onExamFinished?.(data.payload);
      } else if (data.event === 'displayQuestion') {
        onDisplayQuestion?.(data.payload);
      }

      setIsConnected(true);
      setError(null);
      setRetryCount(0);

    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Requête annulée');
        return;
      }

      console.error('Erreur polling:', error);
      
      if (mountedRef.current) {
        setError(error.message);
        
        // Gestion des tentatives
        if (retryCount < maxRetries) {
          setRetryCount(prev => prev + 1);
        } else {
          setIsConnected(false);
        }
      }
    }
  }, [sessionId, lastEventId, onExamDistributed, onExamStarted, onExamFinished, onDisplayQuestion, retryCount, maxRetries]);

  // Démarrer le polling
  useEffect(() => {
    mountedRef.current = true;
    
    const startPolling = async () => {
      // Première requête immédiate
      await fetchTerminalState();
      
      // Puis polling régulier
      pollingRef.current = setInterval(fetchTerminalState, pollingInterval);
    };

    startPolling();

    return () => {
      mountedRef.current = false;
      
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
      
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchTerminalState, pollingInterval]);

  // Fonction pour envoyer des événements
  const emit = useCallback(async (event, data) => {
    try {
      const response = await axios.post(
        `${NODE_BACKEND_URL}/api/terminal/event`,
        { event, data, sessionId }
      );
      return response.data;
    } catch (error) {
      console.error(`Erreur émission ${event}:`, error);
      throw error;
    }
  }, [sessionId]);

  return {
    isConnected,
    error,
    retryCount,
    emit,
    lastEventId
  };
};

export default useTerminalPolling;