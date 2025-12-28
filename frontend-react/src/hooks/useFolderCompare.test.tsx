import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useFolderCompare } from './useFolderCompare';
import { api } from '../api';

vi.mock('../api', () => ({
    api: {
        addToHistory: vi.fn(),
        compareFolders: vi.fn()
    }
}));

describe('useFolderCompare', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('fetches comparison data', async () => {
        const mockData = { name: 'root', path: '', type: 'directory', status: 'same' };
        (api.compareFolders as any).mockResolvedValue(mockData);

        const { result } = renderHook(() => useFolderCompare());

        expect(result.current.loading).toBe(false);

        act(() => {
            result.current.compare('/left', '/right', '', '');
        });

        expect(result.current.loading).toBe(true);
        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.treeData).toEqual(mockData);
        expect(api.addToHistory).toHaveBeenCalledWith('/left', '/right');
    });
});
