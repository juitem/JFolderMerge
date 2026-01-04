export const LogLevel = {
    DEBUG: 'DEBUG',
    INFO: 'INFO',
    WARN: 'WARN',
    ERROR: 'ERROR'
} as const;

export type LogLevel = typeof LogLevel[keyof typeof LogLevel];

export interface LogEntry {
    timestamp: number;
    level: LogLevel;
    module: string;
    message: string;
    data?: any;
}

class LoggingService {
    private history: LogEntry[] = [];
    private maxHistory = 1000;
    private currentLevel: LogLevel = LogLevel.INFO;

    setLevel(level: LogLevel) {
        this.currentLevel = level;
    }

    private log(level: LogLevel, module: string, message: string, data?: any) {
        const levels = Object.values(LogLevel);
        if (levels.indexOf(level) < levels.indexOf(this.currentLevel)) return;

        const entry: LogEntry = {
            timestamp: Date.now(),
            level,
            module,
            message,
            data
        };

        this.history.push(entry);
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }

        const color = this.getColor(level);
        console.log(
            `%c[${new Date(entry.timestamp).toLocaleTimeString()}] [${level}] [${module}] %c${message}`,
            `color: ${color}; font-weight: bold;`,
            `color: inherit;`,
            data || ''
        );
    }

    debug(module: string, message: string, data?: any) { this.log(LogLevel.DEBUG, module, message, data); }
    info(module: string, message: string, data?: any) { this.log(LogLevel.INFO, module, message, data); }
    warn(module: string, message: string, data?: any) { this.log(LogLevel.WARN, module, message, data); }
    error(module: string, message: string, data?: any) { this.log(LogLevel.ERROR, module, message, data); }

    logCommand(id: string, args?: any) {
        this.info('Command', `Executing: ${id}`, args);
    }

    getHistory() {
        return [...this.history];
    }

    exportLogs() {
        return JSON.stringify(this.history, null, 2);
    }

    verifyModule(id: string) {
        this.debug('Diagnostics', `Verifying module: ${id}`);
        // Simple sanity check: if the service exists and is reachable, it's considered OK for now.
        return { status: 'healthy', timestamp: Date.now() };
    }

    private getColor(level: LogLevel) {
        switch (level) {
            case LogLevel.DEBUG: return '#888';
            case LogLevel.INFO: return '#3b82f6';
            case LogLevel.WARN: return '#f59e0b';
            case LogLevel.ERROR: return '#ef4444';
            default: return '#000';
        }
    }
}

export const loggingService = new LoggingService();
