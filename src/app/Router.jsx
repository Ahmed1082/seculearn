import { Routes, Route } from "react-router-dom";

import PublicLayout from "../layouts/PublicLayout";
import LecturerLayout from "../layouts/lecturerLayout";
import TALayout from "../layouts/TALayout";
import StudentLayout from "../layouts/StudentLayout";

import Welcome from "../pages/public/Welcome";
import Login from "../pages/public/Login";

/* ================= Lecturer ================= */
import LecturerOverview from "../pages/lecturer/Overview";
import LecturerCourses from "../pages/lecturer/Courses";
import LecturerCourseDetails from "../pages/lecturer/CourseDetails";
import LecturerLectureDetails from "../pages/lecturer/LectureDetails";
import LecturerSectionDetails from "../pages/lecturer/SectionDetails";
import LecturerMembers from "../pages/lecturer/Members";

/* ================= TA ================= */
import TAOverview from "../pages/ta/Overview";
import TACourses from "../pages/ta/Courses";
import TACourseDetails from "../pages/ta/CourseDetails";
import TALectureDetails from "../pages/ta/LectureDetails";
import TASectionDetails from "../pages/ta/SectionDetails";
import TAMembers from "../pages/ta/Members";

/* ================= Student ================= */
import StudentCourses from "../pages/student/Courses";
import StudentCourseDetails from "../pages/student/CourseDetails";
import StudentLectureDetails from "../pages/student/LectureDetails";
import StudentSubmitLectureAssignment from "../pages/student/SubmitLectureAssignment";
import StudentSubmitLectureQuizzes from "../pages/student/SubmitLectureQuizzes";
import StudentSectionDetails from "../pages/student/SectionDetails";
import StudentSubmitSectionAssignment from "../pages/student/SubmitSectionAssignment";
import StudentSubmitSectionQuizzes from "../pages/student/SubmitSectionQuizzes";
import StudentAllAssignments from "../pages/student/AllAssignments";
import StudentAllQuizzes from "../pages/student/AllQuizzes";
import StudentMembers from "../pages/student/Members";

const Router = () => (
  <Routes>

    {/* ================= Public ================= */}
    <Route element={<PublicLayout />}>
      <Route path="/" element={<Welcome />} />
      <Route path="/login" element={<Login />} />
    </Route>

    {/* ================= Lecturer ================= */}
    <Route element={<LecturerLayout />}>
      <Route path="/lecturer" element={<LecturerOverview />} />
      <Route path="/lecturer/courses" element={<LecturerCourses />} />
      {/* 🔥 Dynamic Course ID */}
      <Route path="/lecturer/courses/:courseId" element={<LecturerCourseDetails />} />
      <Route path="/lecturer/lectureDetails" element={<LecturerLectureDetails />} />
      <Route path="/lecturer/sectionDetails" element={<LecturerSectionDetails />} />
      <Route path="/lecturer/members" element={<LecturerMembers />} />
    </Route>

    {/* ================= TA ================= */}
    <Route element={<TALayout />}>
      <Route path="/ta" element={<TAOverview />} />
      <Route path="/ta/courses" element={<TACourses />} />
      {/* 🔥 Dynamic Course ID */}
      <Route path="/ta/courses/:courseId" element={<TACourseDetails />} />
      <Route path="/ta/lectureDetails" element={<TALectureDetails />} />
      <Route path="/ta/sectionDetails" element={<TASectionDetails />} />
      <Route path="/ta/members" element={<TAMembers />} />
    </Route>

    {/* ================= Student ================= */}
    <Route element={<StudentLayout />}>
      <Route path="/student" element={<StudentCourses />} />
      <Route path="/student/courses" element={<StudentCourses />} />
      {/* 🔥 Dynamic Course ID */}
      <Route path="/student/courses/:courseId" element={<StudentCourseDetails />} />
      <Route path="/student/lectureDetails" element={<StudentLectureDetails />} />
      <Route path="/student/lecture/submitAssignment" element={<StudentSubmitLectureAssignment />} />
      <Route path="/student/lecture/submitQuizzes" element={<StudentSubmitLectureQuizzes />} />
      <Route path="/student/sectionDetails" element={<StudentSectionDetails />} />
      <Route path="/student/section/submitAssignment" element={<StudentSubmitSectionAssignment />} />
      <Route path="/student/section/submitQuizzes" element={<StudentSubmitSectionQuizzes />} />
      <Route path="/student/allAssignments" element={<StudentAllAssignments />} />
      <Route path="/student/allQuizzes" element={<StudentAllQuizzes />} />
      <Route path="/student/members" element={<StudentMembers />} />
    </Route>

  </Routes>
);

export default Router;
