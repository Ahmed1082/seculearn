import { Outlet } from "react-router-dom";
import MainHeader from "../components/MainHeader";
import Footer from "../components/Footer";

const InstructorLayout = () => (
  <>
    <MainHeader role="instructor" />
    <Outlet />
    <Footer />
  </>
);
export default InstructorLayout;
