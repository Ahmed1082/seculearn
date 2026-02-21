import { Routes, Route } from "react-router-dom";

import PublicLayout from "../layouts/PublicLayout";
import InstructorLayout from "../layouts/InstructorLayout";
import TALayout from "../layouts/TALayout";
import StudentLayout from "../layouts/StudentLayout";

import Welcome from "../pages/public/Welcome";
import Login from "../pages/public/Login";

/* ================= Instructor ================= */
import InstructorDashboard from "../pages/instructor/Dashboard";
import InstructorCourses from "../pages/instructor/Courses";
import InstructorCourseDetails from "../pages/instructor/CourseDetails";
import InstructorLectureDetails from "../pages/instructor/LectureDetails";
import InstructorSectionDetails from "../pages/instructor/SectionDetails";
import InstructorMembers from "../pages/instructor/Members";

/* ================= TA ================= */
import TADashboard from "../pages/ta/Dashboard";
import TACourses from "../pages/ta/Courses";
import TACourseDetails from "../pages/ta/CourseDetails";
import TALectureDetails from "../pages/ta/LectureDetails";
import TASectionDetails from "../pages/ta/SectionDetails";
import TAMembers from "../pages/ta/Members";

/* ================= Student ================= */
import StudentDashboard from "../pages/student/Dashboard";
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

    {/* ================= Instructor ================= */}
    <Route element={<InstructorLayout />}>
      <Route path="/instructor" element={<InstructorDashboard />} />
      <Route path="/instructor/courses" element={<InstructorCourses />} />
      {/* 🔥 Dynamic Course ID */}
      <Route path="/instructor/courses/:courseId" element={<InstructorCourseDetails />} />
      <Route path="/instructor/lectureDetails" element={<InstructorLectureDetails />} />
      <Route path="/instructor/sectionDetails" element={<InstructorSectionDetails />} />
      <Route path="/instructor/members" element={<InstructorMembers />} />
    </Route>

    {/* ================= TA ================= */}
    <Route element={<TALayout />}>
      <Route path="/ta" element={<TADashboard />} />
      <Route path="/ta/courses" element={<TACourses />} />
      {/* 🔥 Dynamic Course ID */}
      <Route path="/ta/courses/:courseId" element={<TACourseDetails />} />
      <Route path="/ta/lectureDetails" element={<TALectureDetails />} />
      <Route path="/ta/sectionDetails" element={<TASectionDetails />} />
      <Route path="/ta/members" element={<TAMembers />} />
    </Route>

    {/* ================= Student ================= */}
    <Route element={<StudentLayout />}>
      <Route path="/student" element={<StudentDashboard />} />
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