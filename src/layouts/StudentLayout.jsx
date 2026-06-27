import { Navigate, Outlet } from "react-router-dom";
import MainHeader from "../components/MainHeader";
import Footer from "../components/Footer";

const StudentLayout = () => {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (role !== "student") {
    if (role === "lecturer") return <Navigate to="/lecturer" replace />;
    if (role === "ta") return <Navigate to="/ta" replace />;
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      <MainHeader role="student" />
      <Outlet />
      <Footer />
    </>
  );
};

export default StudentLayout;
