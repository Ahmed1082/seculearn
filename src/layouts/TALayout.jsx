import { Outlet } from "react-router-dom";
import MainHeader from "../components/MainHeader";
import Footer from "../components/Footer";

const TALayout = () => (
  <>
    <MainHeader role="ta" />
    <Outlet />
    <Footer />
  </>
);
export default TALayout;
