import { Navigate, Outlet } from "react-router-dom";
import MainHeader from "../components/MainHeader";
import Footer from "../components/Footer";

const TALayout = () => {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (role !== "ta") {
    if (role === "student") return <Navigate to="/student/courses" replace />;
    if (role === "lecturer") return <Navigate to="/lecturer" replace />;
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      <MainHeader role="ta" />
      <Outlet />
      <Footer />
    </>
  );
};

export default TALayout;
