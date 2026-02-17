import { Link } from "react-router-dom";
import "../styles/SimpleHeader.css";
import logo from "../images/logo.png";
import secuText from "../images/SecuLearn.png";


const SimpleHeader = ({ showLoginButton = false }) => {
  return (
    <header className="simple-header">
      <div className="header-container">
        <div className="logo">
          <img src={logo} alt="Shield" className="logo-icon" />
          <img src={secuText} alt="SecuLearn" className="logo-text" />
        </div>
        {showLoginButton && (
          <Link to="/login" className="login-btn">
            LOG IN
          </Link>
        )}
      </div>

      <div className="header-line"></div>
    </header>
  );
};

export default SimpleHeader;
