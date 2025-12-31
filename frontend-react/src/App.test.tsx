import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';
import { ConfigProvider } from './contexts/ConfigContext';

// Mock API
vi.mock('./api', () => ({
    api: {
        fetchConfig: vi.fn().mockResolvedValue({ left: '/l', right: '/r' }),
        saveConfig: vi.fn(),
        fetchHistory: vi.fn().mockResolvedValue([]),
    }
}));

describe('App', () => {
    it('renders without crashing', async () => {
        render(
            <ConfigProvider>
                <App />
            </ConfigProvider>
        );
        // Since we mock API, eventually it stops loading or shows header.
        // Check for "J's Visual Folder Merge" in header.
        // Use findByText to wait for async (if needed), though header is static.
        // However, ConfigProvider loading state might delay content.
        // But Header is rendered ALWAYS?
        // Let's check App.tsx layout.
        // Header is rendered OUTSIDE "if (!config && configLoading)".
        // So it should appear immediately.
        // But config request is async.
        expect(await screen.findByText(/J's Visual Folder Merge/i)).toBeInTheDocument();
    });
});
