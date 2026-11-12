import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FeedShareButton } from '@/components/feed/feed-share-button';

const PATH = '/look/dramatic';
const TITLE = 'Dramatic Liberty streetwear';
const url = () => new URL(PATH, window.location.origin).toString();

const setNavigator = (key: 'share' | 'clipboard', value: unknown) =>
  Object.defineProperty(navigator, key, { value, configurable: true, writable: true });

const nativeShare = vi.fn();
const writeText = vi.fn();

const renderButton = () => render(<FeedShareButton title={TITLE} path={PATH} />);
const press = async () => {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Chia sẻ' }));
  });
};
const status = () => screen.getByRole('status');

beforeEach(() => {
  nativeShare.mockReset().mockResolvedValue(undefined);
  writeText.mockReset().mockResolvedValue(undefined);
  setNavigator('share', nativeShare);
  setNavigator('clipboard', { writeText });
});

afterEach(() => {
  vi.useRealTimers();
});

const abortError = () => Object.assign(new Error('The user aborted a request.'), { name: 'AbortError' });
const notAllowed = () => Object.assign(new Error('Permission denied'), { name: 'NotAllowedError' });

describe('FeedShareButton', () => {
  it('opens the native share sheet with the title and the absolute outfit URL', async () => {
    renderButton();
    await press();
    expect(nativeShare).toHaveBeenCalledWith({ title: TITLE, url: url() });
    expect(writeText).not.toHaveBeenCalled();
    expect(status()).toBeEmptyDOMElement();
  });

  it('copies the link and says so when the browser has no share sheet', async () => {
    setNavigator('share', undefined);
    renderButton();
    await press();
    expect(writeText).toHaveBeenCalledWith(url());
    expect(status()).toHaveTextContent('Đã chép link');
  });

  it('copies the link when the share sheet is blocked by a permissions policy', async () => {
    nativeShare.mockRejectedValue(notAllowed());
    renderButton();
    await press();
    expect(writeText).toHaveBeenCalledWith(url());
    expect(status()).toHaveTextContent('Đã chép link');
  });

  it('stays silent when the visitor dismisses the share sheet', async () => {
    nativeShare.mockRejectedValue(abortError());
    renderButton();
    await press();
    expect(writeText).not.toHaveBeenCalled();
    expect(status()).toBeEmptyDOMElement();
  });

  it('reports failure when both sharing and copying fail', async () => {
    setNavigator('share', undefined);
    writeText.mockRejectedValue(notAllowed());
    renderButton();
    await press();
    expect(status()).toHaveTextContent('Không chia sẻ được, thử lại sau');
  });

  it('clears the status message after its display time', async () => {
    vi.useFakeTimers();
    setNavigator('share', undefined);
    renderButton();
    await press();
    expect(status()).toHaveTextContent('Đã chép link');

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(status()).toBeEmptyDOMElement();
  });
});
