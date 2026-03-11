import { Routes, Route } from "react-router-dom";

import PublicLayout from "../layouts/PublicLayout";
import LecturerLayout from "../layouts/lecturerLayout";
import TALayout from "../layouts/TALayout";
import StudentLayout from "../layouts/StudentLayout";

import AssignmentReview from "../pages/shared/AssignmentReview";

import Welcome from "../pages/public/Welcome";
import Login from "../pages/public/Login";

/* ================= Lecturer ================= */
import LecturerOverview from "../pages/lecturer/Overview";
import LecturerCourses from "../pages/lecturer/Courses";
import LecturerCourseDetails from "../pages/lecturer/CourseDetails";
import LecturerContentDetails from "../pages/lecturer/ContentDetails";
import LecturerMembers from "../pages/lecturer/Members";


/* ================= TA ================= */
import TAOverview from "../pages/ta/Overview";
import TACourses from "../pages/ta/Courses";
import TACourseDetails from "../pages/ta/CourseDetails";
import TAContentDetails from "../pages/ta/ContentDetails";
import TAMembers from "../pages/ta/Members";

/* ================= Student ================= */
import StudentCourses from "../pages/student/Courses";
import StudentCourseDetails from "../pages/student/CourseDetails";
import StudentContentDetails from "../pages/student/ContentDetails";
import StudentSubmitAssignment from "../pages/student/SubmitAssignment";
import StudentSubmitLectureQuizzes from "../pages/student/SubmitLectureQuizzes";
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
      {/* Dynamic Course ID */}
      {/* <Route path="/lecturer/courses/:courseId" element={<LecturerCourseDetails />} />
      <Route path="/lecturer/contentDetails" element={<LecturerContentDetails />} /> */}

       {/* Course Details */}
      <Route path="/lecturer/courses/:courseId" element={<LecturerCourseDetails />} />

      {/* Lecture Content */}
      <Route path="/lecturer/courses/:courseId/lecture/:lectureId" element={<LecturerContentDetails />} />

      {/* Section Content */}
      <Route path="/lecturer/courses/:courseId/section/:sectionId" element={<LecturerContentDetails />} />
      <Route path="/lecturer/members" element={<LecturerMembers />} />
    
      <Route path="/lecturer/assignmentreview/:assignmentId" element={<AssignmentReview />} />
    </Route>

    {/* ================= TA ================= */}
    <Route element={<TALayout />}>
      <Route path="/ta" element={<TAOverview />} />
      <Route path="/ta/courses" element={<TACourses />} />
      {/* Dynamic Course ID */}
      {/* <Route path="/ta/courses/:courseId" element={<TACourseDetails />} />
      <Route path="/ta/contentDetails" element={<TAContentDetails />} /> */}

      {/* Course Details */}
      <Route path="/ta/courses/:courseId" element={<TACourseDetails />} />

      {/* Lecture Content */}
      <Route path="/ta/courses/:courseId/lecture/:lectureId" element={<TAContentDetails />} />

      {/* Section Content */}
      <Route path="/ta/courses/:courseId/section/:sectionId" element={<TAContentDetails />} />
      <Route path="/ta/members" element={<TAMembers />} />

      <Route path="/ta/assignmentreview/:assignmentId" element={<AssignmentReview />} />
    </Route>

    {/* ================= Student ================= */}
    <Route element={<StudentLayout />}>
      <Route path="/student" element={<StudentCourses />} />
      <Route path="/student/courses" element={<StudentCourses />} />
      {/* Dynamic Course ID */}
      {/* <Route path="/student/courses/:courseId" element={<StudentCourseDetails />} />
      <Route path="/student/contentDetails" element={<StudentContentDetails />} />
      <Route path="/student/lecture/:lectureId/:assignmentId" element={<StudentSubmitAssignment unitType="lecture" />} />
      <Route path="/student/lecture/submitQuizzes" element={<StudentSubmitLectureQuizzes />} />
      <Route path="/student/section/:sectionId/:assignmentId" element={<StudentSubmitAssignment unitType="section" />} />
      <Route path="/student/section/submitQuizzes" element={<StudentSubmitSectionQuizzes />} />
       */}

       {/* Course Details */}
      <Route path="/student/courses/:courseId" element={<StudentCourseDetails />} />

      {/* Lecture Content */}
      <Route path="/student/courses/:courseId/lecture/:lectureId" element={<StudentContentDetails />} />

      {/* Section Content */}
      <Route path="/student/courses/:courseId/section/:sectionId" element={<StudentContentDetails />} />

      {/* Submit Assignment */}
      <Route
        path="/student/courses/:courseId/lecture/:lectureId/assignment/:assignmentId"
        element={<StudentSubmitAssignment unitType="lecture" />}
      />

      <Route
        path="/student/courses/:courseId/section/:sectionId/assignment/:assignmentId"
        element={<StudentSubmitAssignment unitType="section" />}
      />

      {/* Submit Quizzes */}
      <Route
        path="/student/courses/:courseId/lecture/:lectureId/quizzes"
        element={<StudentSubmitLectureQuizzes />}
      />

      <Route
        path="/student/courses/:courseId/section/:sectionId/quizzes"
        element={<StudentSubmitSectionQuizzes />}
      />
      <Route path="/student/allAssignments" element={<StudentAllAssignments />} />
      <Route path="/student/allQuizzes" element={<StudentAllQuizzes />} />
      <Route path="/student/members" element={<StudentMembers />} />
    </Route>

  </Routes>
);

export default Router;
