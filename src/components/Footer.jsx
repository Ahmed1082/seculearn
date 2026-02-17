import "../styles/Footer.css";
import { FaFacebookF, FaLinkedinIn, FaInstagram } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";

const Footer = () => {
  return (
    <footer className="footer">

      <div className="footer-line"></div>

      <div className="footer-content">
        <div className="footer-left">
          © 2026 SecuLearn
        </div>

        <div className="footer-right">
          <a href="#" className="icon"><FaFacebookF /></a>
          <a href="#" className="icon"><FaXTwitter /></a>
          <a href="#" className="icon"><FaLinkedinIn /></a>
          <a href="#" className="icon"><FaInstagram /></a>
        </div>
      </div>

    </footer>
  );
};

export default Footer;
