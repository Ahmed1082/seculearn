import { Outlet, useLocation } from "react-router-dom";
import SimpleHeader from "../components/SimpleHeader";
import Footer from "../components/Footer";

const PublicLayout = () => {
  const location = useLocation();

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
