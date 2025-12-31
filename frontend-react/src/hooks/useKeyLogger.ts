import { useCallback } from 'react';

/**
 * useKeyLogger
 * A simple hook to log keyboard events with context metadata.
 * Helps in debugging event flow, bubbling, and handler execution.
 */
export const useKeyLogger = (componentName: string) => {
    const logKey = useCallback((e: React.KeyboardEvent, context: Record<string, any> = {}) => {
        // Use standard Vite/Modern global check, fallback to true if unsure in dev
        const isDev = import.meta.env ? import.meta.env.DEV : false;
        if (isDev) {
            const basicInfo = {
                key: e.key,
                code: e.code,
                ctrl: e.ctrlKey,
                shift: e.shiftKey,
                meta: e.metaKey
            };

            console.debug(`[Key] ${componentName}`, {
                event: basicInfo,
                context,
                target: e.target,
                currentTarget: e.currentTarget
            });
        }
    }, [componentName]);

    return { logKey };
};
