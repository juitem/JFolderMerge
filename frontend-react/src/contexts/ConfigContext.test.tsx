import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConfigProvider, useConfig } from './ConfigContext';
import { api } from '../api';

// Mock API
vi.mock('../api', () => ({
    api: {
        fetchConfig: vi.fn(),
        saveConfig: vi.fn()
    }
}));

describe('ConfigContext', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('loads config on mount', async () => {
        const mockConfig = { left: '/a', right: '/b', folderFilters: { added: true } };
        (api.fetchConfig as any).mockResolvedValue(mockConfig);

        const wrapper = ({ children }: { children: React.ReactNode }) => <ConfigProvider>{children}</ConfigProvider>;
        const { result } = renderHook(() => useConfig(), { wrapper });

        // Initial state
        expect(result.current.loading).toBe(true);

        // Wait for effect
        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.config).toEqual(mockConfig);
        expect(api.fetchConfig).toHaveBeenCalledTimes(1);
    });

    it('toggles filter correctly', async () => {
        const mockConfig = { folderFilters: { added: true, removed: false } };
        (api.fetchConfig as any).mockResolvedValue(mockConfig);

        const wrapper = ({ children }: { children: React.ReactNode }) => <ConfigProvider>{children}</ConfigProvider>;
        const { result } = renderHook(() => useConfig(), { wrapper });

        await waitFor(() => expect(result.current.loading).toBe(false));

        act(() => {
            result.current.toggleFilter('added');
        });

        expect(result.current.config?.folderFilters?.added).toBe(false);
    });
});
