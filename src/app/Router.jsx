import { Routes, Route } from "react-router-dom";

import PublicLayout from "../layouts/PublicLayout";
import InstructorLayout from "../layouts/InstructorLayout";
import TALayout from "../layouts/TALayout";
import StudentLayout from "../layouts/StudentLayout";

import Welcome from "../pages/public/Welcome";
import Login from "../pages/public/Login";
import Members from "../pages/public/Members";

// Instructor
import InstructorDashboard from "../pages/instructor/Dashboard";
import InstructorCourses from "../pages/instructor/Courses";
import InstructorCourseDetails from "../pages/instructor/CourseDetails";
import InstructorLectureDetails from "../pages/instructor/LectureDetails";
// import InstructorLectureAssignments from "../pages/instructor/SubmitLectureAssignment";
// import InstructorLectureQuizzes from "../pages/instructor/LectureQuizzes";
import InstructorSectionDetails from "../pages/instructor/SectionDetails";
// import InstructorSectionAssignments from "../pages/instructor/SectionAssignments";
// import InstructorSectionQuizzes from "../pages/instructor/SectionQuizzes";

// TA
import TADashboard from "../pages/ta/Dashboard";
import TACourses from "../pages/ta/Courses";
import TACourseDetails from "../pages/ta/CourseDetails";
import TALectureDetails from "../pages/ta/LectureDetails";
// import TALectureAssignments from "../pages/ta/SubmitLectureAssignment";
// import TALectureQuizzes from "../pages/ta/LectureQuizzes";
import TASectionDetails from "../pages/ta/SectionDetails";
// import TASectionAssignments from "../pages/ta/SectionAssignments";
// import TASectionQuizzes from "../pages/ta/SectionQuizzes";


// Student
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

const Router = () => (
  <Routes>

    {/* Public */}
    <Route element={<PublicLayout />}>
      <Route path="/" element={<Welcome />} />
      <Route path="/login" element={<Login />} />
      <Route path="/members" element={<Members />} />
    </Route>

    {/* Instructor */}
    <Route element={<InstructorLayout />}>
      <Route path="/instructor" element={<InstructorDashboard />} />
      <Route path="/instructor/courses" element={<InstructorCourses />} />
      <Route path="/instructor/coursedetails" element={<InstructorCourseDetails />} />
      <Route path="/instructor/LectureDetails" element={<InstructorLectureDetails />} />
      {/* <Route path="/instructor/lecture/SubmitLectureAssignment" element={<InstructorSubmitLectureAssignment />} /> */}
      {/* <Route path="/instructor/lecture/quizzes" element={<InstructorLectureQuizzes />} /> */}
      <Route path="/instructor/sectionDetails" element={<InstructorSectionDetails />} />
      {/* <Route path="/instructor/section/assignments" element={<InstructorSectionAssignments />} /> */}
      {/* <Route path="/instructor/section/SubmitSectionQuizzes" element={<InstructorSubmitSectionQuizzes />} /> */}
    </Route>

    {/* TA */}
    <Route element={<TALayout />}>
      <Route path="/ta" element={<TADashboard />} />
      <Route path="/ta/courses" element={<TACourses />} />
      <Route path="/ta/coursecoursedetails" element={<TACourseDetails />} />
      <Route path="/ta/LectureDetails" element={<TALectureDetails />} />
      {/* <Route path="/ta/lecture/SubmitLectureAssignment" element={<TALectureAssignments />} /> */}
      {/* <Route path="/ta/lecture/quizzes" element={<TALectureQuizzes />} /> */}
      <Route path="/ta/sectionDetails" element={<TASectionDetails />} />
      {/* <Route path="/ta/section/assignments" element={<TASectionAssignments />} /> */}
      {/* <Route path="/ta/section/quizzes" element={<TASectionQuizzes />} /> */}
    </Route>

    {/* Student */}
    <Route element={<StudentLayout />}>
      <Route path="/student" element={<StudentDashboard />} />
      <Route path="/student/courses" element={<StudentCourses />} />
      <Route path="/student/coursecoursedetails" element={<StudentCourseDetails />} />
      <Route path="/student/LectureDetails" element={<StudentLectureDetails />} />
      <Route path="/student/lecture/SubmitLectureAssignment" element={<StudentSubmitLectureAssignment />} />
      <Route path="/student/lecture/SubmitLectureQuizzes" element={<StudentSubmitLectureQuizzes />} />
      <Route path="/student/sectionDetails" element={<StudentSectionDetails />} />
      <Route path="/student/section/SubmitSectionAssignment" element={<StudentSubmitSectionAssignment />} />
      <Route path="/student/section/SubmitSectionQuizzes" element={<StudentSubmitSectionQuizzes />} />
      <Route path="/student/AllAssignments" element={<StudentAllAssignments />} />
      <Route path="/student/AllQuizzes" element={<StudentAllQuizzes />} />
    </Route>

  </Routes>
);

export default Router;
