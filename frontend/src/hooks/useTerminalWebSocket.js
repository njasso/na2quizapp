/**
 * useTerminalSocketIO.js
 * 
 * ✅ REMPLACE useTerminalWebSocket.js
 * 
 * L'ancienne version utilisait un WebSocket NATIF sur ws://localhost:5000/ws-terminals
 * qui n'existe pas sur le serveur Socket.IO → connexion impossible.
 * 
 * Cette version utilise Socket.IO (compatible avec le serveur existant)
 * + polling HTTP de secours pour les événements critiques.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import io from 'socket.io-client';

const NODE_BACKEND_URL = process.env.REACT_APP_BACKEND_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000');
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || NODE_BACKEND_URL;

/**
 * Génère ou récupère un sessionId stable pour ce terminal
 * Persiste dans localStorage pour survivre aux rechargements de page
 */
function getOrCreateSessionId(prefix = 'TERMINAL') {
    const key = `terminalSessionId_${prefix}`;
    let id = localStorage.getItem(key);
    if (!id) {
        id = `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem(key, id);
    }
    return id;
}

export function useTerminalSocketIO(terminalId) {
    const socketRef = useRef(null);
    const pingIntervalRef = useRef(null);
    const pollIntervalRef = useRef(null);
    const lastPollTimeRef = useRef(0);
    const sessionIdRef = useRef(null);
    const isMountedRef = useRef(true);
    const isCleaningUpRef = useRef(false);

    const [connected, setConnected] = useState(false);
    const [lastMessage, setLastMessage] = useState(null);
    const [error, setError] = useState(null);
    const [reconnectAttempt, setReconnectAttempt] = useState(0);

    // ✅ Envoi de message via Socket.IO
    const sendMessage = useCallback((msgObj) => {
        if (socketRef.current?.connected) {
            socketRef.current.emit(msgObj.type || 'message', msgObj.payload || msgObj);
            return true;
        }
        return false;
    }, []);

    // ✅ Polling HTTP de secours — récupère les événements critiques si le WS est coupé
    const startPollingFallback = useCallback((sessionId) => {
        if (pollIntervalRef.current) return; // déjà actif

        pollIntervalRef.current = setInterval(async () => {
            if (!isMountedRef.current || socketRef.current?.connected) return;

            try {
                const since = lastPollTimeRef.current;
                const res = await fetch(
                    `${NODE_BACKEND_URL}/api/terminal-events/${sessionId}?since=${since}`
                );
                if (!res.ok) return;

                const data = await res.json();
                lastPollTimeRef.current = data.serverTime || Date.now();

                // Traiter les événements manqués
                if (data.events?.length > 0) {
                    data.events.forEach(evt => {
                        if (isMountedRef.current) {
                            setLastMessage({ type: evt.event, payload: evt.payload });
                        }
                    });
                }

                // Si un examen est distribué et qu'on n'était pas connecté, re-déclencher
                if (data.distributedExams?.length > 0 && isMountedRef.current) {
                    const latest = data.distributedExams[data.distributedExams.length - 1];
                    setLastMessage({
                        type: 'examDistributed',
                        payload: latest,
                        isRecovery: true
                    });
                }
            } catch (e) {
                // Erreur réseau silencieuse — le polling réessaiera
            }
        }, 5000); // toutes les 5 secondes quand le WS est coupé
    }, []);

    const stopPollingFallback = useCallback(() => {
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
        }
    }, []);

    useEffect(() => {
        if (!terminalId) return;
        isMountedRef.current = true;
        isCleaningUpRef.current = false;

        // ✅ SessionId stable, survit aux rechargements
        sessionIdRef.current = getOrCreateSessionId(terminalId);

        const socket = io(SOCKET_URL, {
            transports: ['polling', 'websocket'],  // polling d'abord, puis upgrade WS
            reconnection: true,
            reconnectionAttempts: 20,              // plus de tentatives pour les réseaux instables
            reconnectionDelay: 1000,
            reconnectionDelayMax: 8000,            // max 8s entre tentatives
            timeout: 15000,
            forceNew: false,
            // ✅ Heartbeat agressif pour détecter les coupures rapidement
            pingTimeout: 30000,
            pingInterval: 15000,
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            if (!isMountedRef.current) return;
            console.log('✅ Terminal Socket.IO connecté:', socket.id);
            setConnected(true);
            setError(null);
            setReconnectAttempt(0);
            stopPollingFallback(); // plus besoin du polling

            // ✅ Enregistrement avec sessionId stable pour reconnexion transparente
            socket.emit('registerTerminal', {
                sessionId: sessionIdRef.current,
                type: 'terminal',
                terminalId
            });

            // Ping keep-alive espacé
            if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
            pingIntervalRef.current = setInterval(() => {
                if (socket.connected) socket.emit('ping');
            }, 25000);
        });

        socket.on('connect_error', (err) => {
            if (!isMountedRef.current) return;
            console.error('❌ Erreur connexion terminal:', err.message);
            setConnected(false);
            setError(err.message);
            setReconnectAttempt(prev => prev + 1);

            // ✅ Activer le polling de secours dès la première erreur
            startPollingFallback(sessionIdRef.current);
        });

        socket.on('disconnect', (reason) => {
            if (!isMountedRef.current) return;
            console.log('👋 Terminal déconnecté:', reason);
            setConnected(false);
            clearInterval(pingIntervalRef.current);

            if (!isCleaningUpRef.current) {
                // Activer le polling de secours pendant la reconnexion
                startPollingFallback(sessionIdRef.current);
            }
        });

        socket.on('reconnect', (attempt) => {
            if (!isMountedRef.current) return;
            console.log(`🔄 Terminal reconnecté après ${attempt} tentative(s)`);
            setReconnectAttempt(0);
            stopPollingFallback();
        });

        // ── Événements métier ────────────────────────────────────

        socket.on('examDistributed', (data) => {
            if (!isMountedRef.current) return;
            console.log('📦 Examen distribué au terminal:', data);
            setLastMessage({ type: 'examDistributed', payload: data });
        });

        socket.on('examStarted', (data) => {
            if (!isMountedRef.current) return;
            console.log('🚀 Examen démarré:', data);
            setLastMessage({ type: 'examStarted', payload: data });
        });

        socket.on('examFinished', (data) => {
            if (!isMountedRef.current) return;
            console.log('🏁 Examen terminé:', data);
            setLastMessage({ type: 'examFinished', payload: data });
        });

        socket.on('displayQuestion', (data) => {
            if (!isMountedRef.current) return;
            console.log('❓ Question affichée:', data);
            setLastMessage({ type: 'displayQuestion', payload: data });
        });

        socket.on('pong', () => {
            // keep-alive reçu, connexion OK
        });

        return () => {
            isMountedRef.current = false;
            isCleaningUpRef.current = true;
            clearInterval(pingIntervalRef.current);
            stopPollingFallback();
            socket.removeAllListeners();
            socket.disconnect();
        };
    }, [terminalId, startPollingFallback, stopPollingFallback]);

    const getSessionId = useCallback(() => sessionIdRef.current, []);

    return {
        connected,
        lastMessage,
        error,
        reconnectAttempt,
        sendMessage,
        getSessionId,
    };
}