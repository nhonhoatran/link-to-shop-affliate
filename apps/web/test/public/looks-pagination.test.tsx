import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MAX_LIST_PAGE } from '@under30ss/shared';
import { buildPageWindow } from '@/components/public/build-page-window';
import { LooksPagination } from '@/components/public/looks-pagination';
import { parseLooksPageParam } from '@/components/public/parse-looks-page-param';

describe('LooksPagination', () => {
  it('renders nothing for a single page', () => {
    const { container } = render(<LooksPagination page={1} totalPages={1} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('marks the current page and links prev/next with rel', () => {
    render(<LooksPagination page={2} totalPages={3} />);
    expect(screen.getByRole('link', { name: 'Trang 2' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Trước' })).toHaveAttribute('rel', 'prev');
    expect(screen.getByRole('link', { name: 'Trước' })).toHaveAttribute('href', '/looks');
    expect(screen.getByRole('link', { name: 'Sau' })).toHaveAttribute('rel', 'next');
    expect(screen.getByRole('link', { name: 'Sau' })).toHaveAttribute('href', '/looks?page=3');
  });

  it('has no previous link on the first page and no next link on the last', () => {
    const { rerender } = render(<LooksPagination page={1} totalPages={3} />);
    expect(screen.queryByRole('link', { name: 'Trước' })).toBeNull();
    rerender(<LooksPagination page={3} totalPages={3} />);
    expect(screen.queryByRole('link', { name: 'Sau' })).toBeNull();
  });
});

describe('buildPageWindow', () => {
  it('collapses far pages into a gap', () => {
    expect(buildPageWindow(10, 20)).toEqual([1, null, 9, 10, 11, null, 20]);
  });

  it('fills a single missing page instead of showing a gap', () => {
    expect(buildPageWindow(4, 6)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('shows every page when there are few', () => {
    expect(buildPageWindow(1, 3)).toEqual([1, 2, 3]);
  });
});

describe('parseLooksPageParam', () => {
  it.each([
    [undefined, 1],
    ['abc', 1],
    ['0', 1],
    ['-2', 1],
    ['2.5', 1],
    ['99999999999999999999', 1],
    ['3', 3],
    [String(MAX_LIST_PAGE + 1), MAX_LIST_PAGE],
    [['4', '5'], 4],
  ])('parses %j as %i', (raw, expected) => {
    expect(parseLooksPageParam(raw)).toBe(expected);
  });
});

describe('LooksPagination pathForPage', () => {
  it('builds every link with the given path function', () => {
    const pathForPage = (page: number) => `/collections/x?p=${page}`;
    render(<LooksPagination page={2} totalPages={3} pathForPage={pathForPage} />);
    expect(screen.getByRole('link', { name: 'Trước' })).toHaveAttribute('href', '/collections/x?p=1');
    expect(screen.getByRole('link', { name: 'Sau' })).toHaveAttribute('href', '/collections/x?p=3');
    expect(screen.getByRole('link', { name: 'Trang 3' })).toHaveAttribute('href', '/collections/x?p=3');
  });
});

describe('LooksPagination pathForPage', () => {
  it('builds every link with the given path function', () => {
    const pathForPage = (page: number) => `/collections/x?p=${page}`;
    render(<LooksPagination page={2} totalPages={3} pathForPage={pathForPage} />);
    expect(screen.getByRole('link', { name: 'Trước' })).toHaveAttribute('href', '/collections/x?p=1');
    expect(screen.getByRole('link', { name: 'Sau' })).toHaveAttribute('href', '/collections/x?p=3');
    expect(screen.getByRole('link', { name: 'Trang 3' })).toHaveAttribute('href', '/collections/x?p=3');
  });
});
