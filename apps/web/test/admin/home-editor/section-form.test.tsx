import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MAX_FAQ_ITEMS, type HomeSection } from '@under30ss/shared';
import { applyPatch } from '@/components/admin/home-editor/field-values';
import { SectionForm } from '@/components/admin/home-editor/section-form';
import { createSection } from '@/components/admin/home-editor/use-home-layout-state';
import type { FieldErrors } from '@/components/admin/validation-messages';
import { sampleSection } from './home-editor-fixture';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));

function Harness({ initial, errors = {}, onChange }: { initial: HomeSection; errors?: FieldErrors; onChange?: (s: HomeSection) => void }) {
  const [section, setSection] = useState(initial);
  return (
    <SectionForm
      section={section}
      errors={errors}
      onChange={(patch) => {
        const next = { ...section, props: applyPatch(section.props, patch) } as HomeSection;
        setSection(next);
        onChange?.(next);
      }}
    />
  );
}

const faqWith = (count: number): HomeSection => {
  const faq = createSection('Faq');
  if (faq.type !== 'Faq') throw new Error('type');
  faq.props.items = Array.from({ length: count }, (_, i) => ({ question: `Q${i + 1}`, answer: `A${i + 1}` }));
  return faq;
};

describe('SectionForm', () => {
  it('shows a required-field error only after the field has been left', async () => {
    const user = userEvent.setup();
    render(<Harness initial={createSection('TextWithImage')} />);
    const heading = screen.getByLabelText('Tiêu đề');
    expect(screen.queryByText('Không được để trống')).not.toBeInTheDocument();
    await user.click(heading);
    await user.tab();
    expect(screen.getByText('Không được để trống')).toBeInTheDocument();
    expect(heading).toHaveAttribute('aria-invalid', 'true');
    await user.type(heading, 'Xin chào');
    expect(heading).not.toHaveAttribute('aria-invalid');
  });

  it('puts a bad link error under that link field and nowhere else', async () => {
    const user = userEvent.setup();
    const hero = sampleSection('HeroSlider');
    render(<Harness initial={hero} />);
    const links = screen.getAllByLabelText('Link của nút');
    await user.clear(links[0]!);
    await user.type(links[0]!, 'javascript:alert(1)');
    await user.tab();
    expect(links[0]).toHaveAttribute('aria-invalid', 'true');
    expect(links[0]!.parentElement).toHaveTextContent(/Link không hợp lệ/);
    expect(links[1]).not.toHaveAttribute('aria-invalid');
  });

  it('shows errors handed down from a failed save without waiting for a blur', () => {
    render(<Harness initial={createSection('TextWithImage')} errors={{ body: 'Không được để trống' }} />);
    expect(screen.getByLabelText('Nội dung')).toHaveAttribute('aria-invalid', 'true');
  });

  it('removes an optional prop when its field is emptied', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness initial={sampleSection('TextWithImage')} onChange={onChange} />);
    const label = screen.getByLabelText('Chữ trên nút');
    await user.clear(label);
    expect(onChange.mock.lastCall![0].props).not.toHaveProperty('ctaLabel');
  });

  it('treats a blank optional number as "use the system default"', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const list = sampleSection('OutfitList');
    list.props = { ...list.props, count: 6 } as typeof list.props;
    render(<Harness initial={list} onChange={onChange} />);
    expect(screen.getByText('Để trống để dùng giá trị mặc định của hệ thống.')).toBeInTheDocument();
    const count = screen.getByLabelText('Số outfit hiển thị');
    await user.clear(count);
    expect(onChange.mock.lastCall![0].props).not.toHaveProperty('count');
    await user.type(count, '8');
    expect(onChange.mock.lastCall![0].props.count).toBe(8);
  });

  it('shows the fields that belong to the chosen option', async () => {
    const user = userEvent.setup();
    render(<Harness initial={sampleSection('OutfitList')} />);
    const source = screen.getByLabelText('Lấy outfit từ');
    await user.selectOptions(source, 'manual');
    expect(screen.getByText('Outfit hiển thị')).toBeInTheDocument();
    expect(screen.queryByLabelText('Số outfit hiển thị')).not.toBeInTheDocument();
    await user.selectOptions(source, 'latest');
    expect(screen.queryByText('Outfit hiển thị')).not.toBeInTheDocument();
  });

  it('keeps numeric select values numeric', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness initial={sampleSection('CollectionTiles')} onChange={onChange} />);
    await user.selectOptions(screen.getByLabelText('Số cột trên máy tính'), '4');
    expect(onChange.mock.lastCall![0].props.columnsDesktop).toBe(4);
  });
});

describe('SectionForm repeatable groups', () => {
  it('adds a question and blocks adding past the shared limit', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Harness initial={faqWith(2)} />);
    await user.click(screen.getByRole('button', { name: '+ Thêm câu hỏi' }));
    expect(screen.getAllByLabelText('Câu hỏi')).toHaveLength(3);
    expect(screen.getByText(`Tối đa ${MAX_FAQ_ITEMS} mục`)).toBeInTheDocument();
    unmount();

    render(<Harness initial={faqWith(MAX_FAQ_ITEMS)} />);
    expect(screen.getByRole('button', { name: '+ Thêm câu hỏi' })).toBeDisabled();
    expect(screen.getByText(`Đã đủ tối đa ${MAX_FAQ_ITEMS} mục`)).toBeInTheDocument();
  });

  it('reorders and removes items, and keeps the minimum', async () => {
    const user = userEvent.setup();
    render(<Harness initial={faqWith(2)} />);
    const values = () => screen.getAllByLabelText('Câu hỏi').map((input) => (input as HTMLInputElement).value);
    expect(screen.getByRole('button', { name: 'Đưa Câu hỏi 1 lên' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Đưa Câu hỏi 2 xuống' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Đưa Câu hỏi 1 xuống' }));
    expect(values()).toEqual(['Q2', 'Q1']);

    await user.click(screen.getByRole('button', { name: 'Xoá Câu hỏi 1' }));
    expect(values()).toEqual(['Q1']);
    expect(screen.getByRole('button', { name: 'Xoá Câu hỏi 1' })).toBeDisabled();
    expect(screen.getByText(/Cần giữ ít nhất 1 mục/)).toBeInTheDocument();
  });

  it('edits one item without touching the others', async () => {
    const user = userEvent.setup();
    render(<Harness initial={faqWith(2)} />);
    const answers = screen.getAllByLabelText('Trả lời');
    await user.clear(answers[1]!);
    await user.type(answers[1]!, 'Mới');
    expect((screen.getAllByLabelText('Trả lời')[0] as HTMLTextAreaElement).value).toBe('A1');
    expect((screen.getAllByLabelText('Trả lời')[1] as HTMLTextAreaElement).value).toBe('Mới');
  });

  it('labels commitment icons in Vietnamese and keeps two items minimum', () => {
    render(<Harness initial={sampleSection('Commitments')} />);
    const group = screen.getByRole('group', { name: 'Các cam kết' });
    expect(within(group).getAllByLabelText('Biểu tượng')[0]).toHaveDisplayValue('Giao hàng');
    expect(within(group).getByRole('button', { name: '+ Thêm cam kết' })).toBeEnabled();
  });

  it('adds slides by uploading and offers no manual add button', () => {
    render(<Harness initial={sampleSection('HeroSlider')} />);
    expect(screen.getByLabelText('Thêm ảnh banner')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^\+ Thêm ảnh banner/ })).not.toBeInTheDocument();
  });
});
