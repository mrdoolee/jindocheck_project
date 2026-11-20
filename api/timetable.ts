import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  fetchSchoolData,
  listTeachers,
  getGradeClassCounts,
  getPeriodTimes,
  getClassTimetable,
  getTeacherTimetable,
  ComciError,
} from './_lib/comci.js';

// Public school timetable data — no session/auth needed, unlike the Google Sheets endpoints.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const schoolCode = req.query.schoolCode as string | undefined;
  if (!schoolCode) {
    res.status(400).json({ error: 'schoolCode 파라미터가 필요합니다.' });
    return;
  }

  try {
    const data = await fetchSchoolData(schoolCode);
    const body: Record<string, unknown> = {
      schoolName: data.학교명,
      teachers: listTeachers(data),
      gradeClassCounts: getGradeClassCounts(data),
      periods: getPeriodTimes(data),
    };

    const teacherIndexRaw = req.query.teacherIndex as string | undefined;
    if (teacherIndexRaw) {
      const teacherIndex = Number(teacherIndexRaw);
      if (!Number.isInteger(teacherIndex) || teacherIndex < 1) {
        res.status(400).json({ error: 'teacherIndex 값이 올바르지 않습니다.' });
        return;
      }
      body.teacherTimetable = getTeacherTimetable(data, teacherIndex);
    }

    const gradeRaw = req.query.grade as string | undefined;
    const classNumRaw = req.query.classNum as string | undefined;
    if (gradeRaw && classNumRaw) {
      const grade = Number(gradeRaw);
      const classNum = Number(classNumRaw);
      if (!Number.isInteger(grade) || !Number.isInteger(classNum) || grade < 1 || classNum < 1) {
        res.status(400).json({ error: 'grade/classNum 값이 올바르지 않습니다.' });
        return;
      }
      body.classTimetable = getClassTimetable(data, grade, classNum);
    }

    res.status(200).json(body);
  } catch (err) {
    if (err instanceof ComciError) {
      res.status(502).json({ error: err.message });
      return;
    }
    console.error('timetable: unexpected error', err);
    res.status(502).json({ error: '컴시간 시간표를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.' });
  }
}
