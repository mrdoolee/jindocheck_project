import { describe, it, expect, vi } from 'vitest';
import { onDirty, notifyDirty, withDirtySuppressed } from './dirtyBus';

describe('dirtyBus', () => {
  it('calls subscribed listeners on notifyDirty', () => {
    const fn = vi.fn();
    const unsubscribe = onDirty(fn);
    notifyDirty();
    expect(fn).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it('stops calling a listener after it unsubscribes', () => {
    const fn = vi.fn();
    const unsubscribe = onDirty(fn);
    unsubscribe();
    notifyDirty();
    expect(fn).not.toHaveBeenCalled();
  });

  it('suppresses notifications raised synchronously inside withDirtySuppressed', async () => {
    const fn = vi.fn();
    const unsubscribe = onDirty(fn);
    await withDirtySuppressed(async () => {
      notifyDirty();
      notifyDirty();
    });
    expect(fn).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('resumes notifying after withDirtySuppressed finishes, even if the callback throws', async () => {
    const fn = vi.fn();
    const unsubscribe = onDirty(fn);
    await expect(
      withDirtySuppressed(async () => {
        throw new Error('boom');
      })
    ).rejects.toThrow('boom');

    notifyDirty();
    expect(fn).toHaveBeenCalledTimes(1);
    unsubscribe();
  });
});
