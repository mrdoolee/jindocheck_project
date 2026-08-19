import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { db } from '../../db/db';
import { createClass } from '../../db/classes';
import { addStudent, updateStudent } from '../../db/students';
import RosterList from './RosterList';

beforeEach(async () => {
  await db.classes.clear();
  await db.students.clear();
});

describe('RosterList', () => {
  it('shows a prompt to pick a class when none is selected', () => {
    render(<RosterList classId="" />);
    expect(screen.getByText('학급을 먼저 선택하세요.')).toBeInTheDocument();
  });

  it('lists students for the selected class', async () => {
    const classId = await createClass('1반');
    await addStudent(classId, 1, '홍길동');
    await addStudent(classId, 2, '김철수');

    render(<RosterList classId={classId} />);

    expect(await screen.findByDisplayValue('홍길동')).toBeInTheDocument();
    expect(screen.getByDisplayValue('김철수')).toBeInTheDocument();
  });

  it('updates a student name on inline-edit blur', async () => {
    const classId = await createClass('1반');
    const studentId = await addStudent(classId, 1, '홍길동');
    const user = userEvent.setup();

    render(<RosterList classId={classId} />);

    const nameInput = await screen.findByDisplayValue('홍길동');
    await user.clear(nameInput);
    await user.type(nameInput, '홍길순');
    nameInput.blur();

    const student = await db.students.get(studentId);
    expect(student?.name).toBe('홍길순');
  });

  it('ignores a blank value on inline-edit blur', async () => {
    const classId = await createClass('1반');
    const studentId = await addStudent(classId, 1, '홍길동');
    const user = userEvent.setup();

    render(<RosterList classId={classId} />);

    const nameInput = await screen.findByDisplayValue('홍길동');
    await user.clear(nameInput);
    nameInput.blur();

    const student = await db.students.get(studentId);
    expect(student?.name).toBe('홍길동');
  });

  it('sets a student role on inline-edit blur', async () => {
    const classId = await createClass('1반');
    const studentId = await addStudent(classId, 1, '홍길동');
    const user = userEvent.setup();

    render(<RosterList classId={classId} />);

    const roleInput = await screen.findByLabelText(`역할-${studentId}`);
    await user.type(roleInput, '실장');
    roleInput.blur();

    const student = await db.students.get(studentId);
    expect(student?.role).toBe('실장');
  });

  it('clears a student role on inline-edit blur', async () => {
    const classId = await createClass('1반');
    const studentId = await addStudent(classId, 1, '홍길동');
    await updateStudent(studentId, { role: '실장' });
    const user = userEvent.setup();

    render(<RosterList classId={classId} />);

    const roleInput = await screen.findByDisplayValue('실장');
    await user.clear(roleInput);
    roleInput.blur();

    const student = await db.students.get(studentId);
    expect(student?.role).toBeNull();
  });

  it('updates a student number on inline-edit blur', async () => {
    const classId = await createClass('1반');
    const studentId = await addStudent(classId, 1, '홍길동');
    const user = userEvent.setup();

    render(<RosterList classId={classId} />);

    const numberInput = await screen.findByLabelText(`번호-${studentId}`);
    await user.clear(numberInput);
    await user.type(numberInput, '9');
    numberInput.blur();

    const student = await db.students.get(studentId);
    expect(student?.number).toBe(9);
  });

  it('deletes a student after confirmation, but not on cancel', async () => {
    const classId = await createClass('1반');
    const studentId = await addStudent(classId, 1, '홍길동');
    const user = userEvent.setup();

    render(<RosterList classId={classId} />);
    await screen.findByDisplayValue('홍길동');

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValueOnce(false);
    await user.click(screen.getByText('삭제'));
    expect(await db.students.get(studentId)).toBeTruthy();

    confirmSpy.mockReturnValueOnce(true);
    await user.click(screen.getByText('삭제'));
    confirmSpy.mockRestore();

    expect(await screen.findByText('등록된 학생이 없습니다.')).toBeInTheDocument();
    expect(await db.students.get(studentId)).toBeUndefined();
  });

  it('reorders students via drag and drop', async () => {
    const classId = await createClass('1반');
    await addStudent(classId, 1, '홍길동');
    await addStudent(classId, 2, '김철수');

    render(<RosterList classId={classId} />);
    await screen.findByDisplayValue('홍길동');

    const items = screen.getAllByRole('listitem');
    expect(within(items[0]).getByDisplayValue('홍길동')).toBeInTheDocument();
    expect(within(items[1]).getByDisplayValue('김철수')).toBeInTheDocument();

    const kimId = (await db.students.toArray()).find((s) => s.name === '김철수')!.id!;
    const store = new Map<string, string>();
    const dataTransfer = {
      setData: (k: string, v: string) => store.set(k, v),
      getData: (k: string) => store.get(k) ?? '',
    };
    store.set('text/plain', String(kimId));

    fireEvent.dragStart(items[1], { dataTransfer });
    fireEvent.dragOver(items[0], { dataTransfer });
    fireEvent.drop(items[0], { dataTransfer });

    await waitFor(async () => {
      const ordered = await db.students.where('classId').equals(classId).sortBy('order');
      expect(ordered.map((s) => s.name)).toEqual(['김철수', '홍길동']);
    });
  });

  it('resets the custom order back to number order', async () => {
    const classId = await createClass('1반');
    await addStudent(classId, 1, '홍길동');
    await addStudent(classId, 2, '김철수');
    const students = await db.students.toArray();
    const kim = students.find((s) => s.name === '김철수')!;
    const hong = students.find((s) => s.name === '홍길동')!;
    // Simulate a prior drag reorder that put 김철수 (number 2) ahead of 홍길동 (number 1).
    await db.students.update(kim.id!, { order: 0 });
    await db.students.update(hong.id!, { order: 1 });

    const user = userEvent.setup();
    render(<RosterList classId={classId} />);

    await screen.findByDisplayValue('김철수');
    const itemsBefore = screen.getAllByRole('listitem');
    expect(within(itemsBefore[0]).getByDisplayValue('김철수')).toBeInTheDocument();

    await user.click(screen.getByText('초기화'));

    await waitFor(async () => {
      const ordered = await db.students.where('classId').equals(classId).sortBy('order');
      expect(ordered.map((s) => s.name)).toEqual(['홍길동', '김철수']);
    });
  });
});
