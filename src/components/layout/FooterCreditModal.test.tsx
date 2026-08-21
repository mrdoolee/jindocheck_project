import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FooterCreditModal from './FooterCreditModal';

describe('FooterCreditModal', () => {
  it('renders nothing when closed', () => {
    render(<FooterCreditModal open={false} onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders the credit and contact content when open', () => {
    render(<FooterCreditModal open onClose={vi.fn()} />);

    const dialog = screen.getByRole('dialog', { name: '제작 정보' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText('✨ 제작: 두리쌤')).toBeInTheDocument();
    expect(screen.getByText('📌 이용 조건')).toBeInTheDocument();
    expect(screen.getByText('📷 문의')).toBeInTheDocument();
    expect(screen.getByText(/간단한 질문 위주로/)).toBeInTheDocument();

    const instagram = screen.getByRole('link', { name: 'trdoolee' });
    expect(instagram).toHaveAttribute('href', 'https://www.instagram.com/trdoolee');
    expect(instagram).toHaveAttribute('target', '_blank');
    expect(instagram).toHaveAttribute('rel', 'noreferrer');

    const blog = screen.getByRole('link', { name: 'blog.naver.com/trdoolee' });
    expect(blog).toHaveAttribute('href', 'https://blog.naver.com/trdoolee');
    expect(blog).toHaveAttribute('target', '_blank');
    expect(blog).toHaveAttribute('rel', 'noreferrer');
  });

  it('closes on backdrop click, close button, and Escape, but not on inner-card click', async () => {
    const user = userEvent.setup();

    const onCloseBackdrop = vi.fn();
    const { unmount: unmount1 } = render(<FooterCreditModal open onClose={onCloseBackdrop} />);
    await user.click(screen.getByRole('dialog').parentElement!);
    expect(onCloseBackdrop).toHaveBeenCalledTimes(1);
    unmount1();

    const onCloseButton = vi.fn();
    const { unmount: unmount2 } = render(<FooterCreditModal open onClose={onCloseButton} />);
    await user.click(screen.getByLabelText('닫기'));
    expect(onCloseButton).toHaveBeenCalledTimes(1);
    unmount2();

    const onCloseEscape = vi.fn();
    const { unmount: unmount3 } = render(<FooterCreditModal open onClose={onCloseEscape} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCloseEscape).toHaveBeenCalledTimes(1);
    unmount3();

    const onCloseInner = vi.fn();
    render(<FooterCreditModal open onClose={onCloseInner} />);
    await user.click(screen.getByText('✨ 제작: 두리쌤'));
    expect(onCloseInner).not.toHaveBeenCalled();
  });

  it('locks and restores body scroll while open', () => {
    document.body.style.overflow = '';
    const { rerender, unmount } = render(<FooterCreditModal open={false} onClose={vi.fn()} />);
    expect(document.body.style.overflow).toBe('');

    rerender(<FooterCreditModal open onClose={vi.fn()} />);
    expect(document.body.style.overflow).toBe('hidden');

    unmount();
    expect(document.body.style.overflow).toBe('');
  });
});
