import { Outlet } from "react-router-dom";
import MainHeader from "../components/MainHeader";
import Footer from "../components/Footer";

const LecturerLayout = () => (
  <>
    <MainHeader role="lecturer" />
    <Outlet />
    <Footer />
  </>
);
export default LecturerLayout;
