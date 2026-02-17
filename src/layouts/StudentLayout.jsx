import { Outlet } from "react-router-dom";
import MainHeader from "../components/MainHeader";
import Footer from "../components/Footer";

const StudentLayout = () => (
  <>
    <MainHeader role="student" />
    <Outlet />
    <Footer />
  </>
);
export default StudentLayout;
