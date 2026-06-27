import { Navigate, Outlet } from "react-router-dom";
import MainHeader from "../components/MainHeader";
import Footer from "../components/Footer";

const LecturerLayout = () => {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (role !== "lecturer") {
    if (role === "student") return <Navigate to="/student/courses" replace />;
    if (role === "ta") return <Navigate to="/ta" replace />;
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      <MainHeader role="lecturer" />
      <Outlet />
      <Footer />
    </>
  );
};

export default LecturerLayout;
