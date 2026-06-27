import { Navigate, Outlet, useLocation } from "react-router-dom";
import SimpleHeader from "../components/SimpleHeader";
import Footer from "../components/Footer";

const PublicLayout = () => {
  const location = useLocation();
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  // If already authenticated, redirect to role's dashboard
  if (token && role && (location.pathname === "/login" || location.pathname === "/")) {
    if (role === "student") return <Navigate to="/student/courses" replace />;
    if (role === "lecturer") return <Navigate to="/lecturer" replace />;
    if (role === "ta") return <Navigate to="/ta" replace />;
  }

  const isLogin = location.pathname === "/login";

  return (
    <>
      <SimpleHeader showLoginButton={!isLogin} />
      <Outlet />
      <Footer />
    </>
  );
};

export default PublicLayout;
