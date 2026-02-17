import { Routes, Route } from "react-router-dom";

import PublicLayout from "../layouts/PublicLayout";
import InstructorLayout from "../layouts/InstructorLayout";
import TALayout from "../layouts/TALayout";
import StudentLayout from "../layouts/StudentLayout";

import Welcome from "../pages/public/Welcome";
import Login from "../pages/public/Login";

// Instructor
import InstructorDashboard from "../pages/instructor/Dashboard";
import InstructorCourses from "../pages/instructor/Courses";
import InstructorCourseDetails from "../pages/instructor/CourseDetails";
import InstructorLecture from "../pages/instructor/Lecture";
import InstructorLectureAssignments from "../pages/instructor/LectureAssignments";
import InstructorLectureQuizzes from "../pages/instructor/LectureQuizzes";
import InstructorSection from "../pages/instructor/Section";
import InstructorSectionAssignments from "../pages/instructor/SectionAssignments";
import InstructorSectionQuizzes from "../pages/instructor/SectionQuizzes";

// TA
import TADashboard from "../pages/ta/Dashboard";
import TACourses from "../pages/ta/Courses";
import TACourseDetails from "../pages/ta/CourseDetails";
import TALecture from "../pages/ta/Lecture";
import TALectureAssignments from "../pages/ta/LectureAssignments";
import TALectureQuizzes from "../pages/ta/LectureQuizzes";
import TASection from "../pages/ta/Section";
import TASectionAssignments from "../pages/ta/SectionAssignments";
import TASectionQuizzes from "../pages/ta/SectionQuizzes";

// Student
import StudentDashboard from "../pages/student/Dashboard";
import StudentCourses from "../pages/student/Courses";
import StudentCourseDetails from "../pages/student/CourseDetails";
import StudentLecture from "../pages/student/Lecture";
import StudentLectureAssignments from "../pages/student/LectureAssignments";
import StudentLectureQuizzes from "../pages/student/LectureQuizzes";
import StudentSection from "../pages/student/Section";
import StudentSectionAssignments from "../pages/student/SectionAssignments";
import StudentSectionQuizzes from "../pages/student/SectionQuizzes";

const Router = () => (
  <Routes>

    {/* Public */}
    <Route element={<PublicLayout />}>
      <Route path="/" element={<Welcome />} />
      <Route path="/login" element={<Login />} />
    </Route>

    {/* Instructor */}
    <Route element={<InstructorLayout />}>
      <Route path="/instructor" element={<InstructorDashboard />} />
      <Route path="/instructor/courses" element={<InstructorCourses />} />
      <Route path="/instructor/course" element={<InstructorCourseDetails />} />
      <Route path="/instructor/lecture" element={<InstructorLecture />} />
      <Route path="/instructor/lecture/assignments" element={<InstructorLectureAssignments />} />
      <Route path="/instructor/lecture/quizzes" element={<InstructorLectureQuizzes />} />
      <Route path="/instructor/section" element={<InstructorSection />} />
      <Route path="/instructor/section/assignments" element={<InstructorSectionAssignments />} />
      <Route path="/instructor/section/quizzes" element={<InstructorSectionQuizzes />} />
    </Route>

    {/* TA */}
    <Route element={<TALayout />}>
      <Route path="/ta" element={<TADashboard />} />
      <Route path="/ta/courses" element={<TACourses />} />
      <Route path="/ta/course" element={<TACourseDetails />} />
      <Route path="/ta/lecture" element={<TALecture />} />
      <Route path="/ta/lecture/assignments" element={<TALectureAssignments />} />
      <Route path="/ta/lecture/quizzes" element={<TALectureQuizzes />} />
      <Route path="/ta/section" element={<TASection />} />
      <Route path="/ta/section/assignments" element={<TASectionAssignments />} />
      <Route path="/ta/section/quizzes" element={<TASectionQuizzes />} />
    </Route>

    {/* Student */}
    <Route element={<StudentLayout />}>
      <Route path="/student" element={<StudentDashboard />} />
      <Route path="/student/courses" element={<StudentCourses />} />
      <Route path="/student/course" element={<StudentCourseDetails />} />
      <Route path="/student/lecture" element={<StudentLecture />} />
      <Route path="/student/lecture/assignments" element={<StudentLectureAssignments />} />
      <Route path="/student/lecture/quizzes" element={<StudentLectureQuizzes />} />
      <Route path="/student/section" element={<StudentSection />} />
      <Route path="/student/section/assignments" element={<StudentSectionAssignments />} />
      <Route path="/student/section/quizzes" element={<StudentSectionQuizzes />} />
    </Route>

  </Routes>
);

export default Router;
