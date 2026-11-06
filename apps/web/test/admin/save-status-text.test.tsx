import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SaveStatusText } from '@/components/admin/save-status-text';

describe('SaveStatusText', () => {
  it.each([
    ['idle', false, ''],
    ['idle', true, 'Có thay đổi chưa lưu'],
    ['saving', true, 'Đang lưu…'],
    ['saved', false, 'Đã lưu'],
    ['saved', true, 'Có thay đổi chưa lưu'],
    ['error', true, 'Chưa lưu được'],
    ['error', false, 'Chưa lưu được'],
  ] as const)('status %s, dirty %s -> %j', (status, dirty, expected) => {
    render(<SaveStatusText status={status} dirty={dirty} />);
    expect(screen.getByRole('status').textContent).toBe(expected);
  });
});
