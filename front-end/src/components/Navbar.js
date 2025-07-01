// import React from "react";
// import { useNavigate } from "react-router-dom"
// import "./Navbar.css";
// import { Link } from "react-router-dom";

// const Navbar = () => {
// return (
// <div className="navbar">
// <div className="logo-section">
// {/* <span className="title">VText Tools</span> */}
//   <Link to="/" className="title" style={{ textDecoration: "none" }}>
//   <strong className="bold">VText</strong>
//   <span className="light">Tools</span>
//   </Link>

// </div>
// <div className="menu">
// <Link to="/" className="nav-link">Trang Chủ</Link>
// <Link to="/tinh-nang" className="nav-link">Tính Năng</Link>
// <Link to="/tac-gia" className="nav-link">Tác giả</Link>
// <Link to="/phan-hoi" className="nav-link">Phản hồi</Link>
// </div>
// </div>
// );
// };

// export default Navbar;
import React from "react";
import { NavLink } from "react-router-dom";
import "./Navbar.css";

const Navbar = () => {
return (
<div className="navbar">
<div className="logo-section">
<NavLink to="/" className="title" style={{ textDecoration: "none" }}>
<strong className="bold">VText</strong>
<span className="light">Tools</span>
</NavLink>
</div>
<div className="menu">
<NavLink
to="/"
end
className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}
>
Trang Chủ
</NavLink>
<NavLink
to="/tinh-nang"
className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}
>
Tính Năng
</NavLink>
<NavLink
to="/tac-gia"
className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}
>
Tác giả
</NavLink>
<NavLink
to="/phan-hoi"
className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}
>
Phản hồi
</NavLink>
</div>
</div>
);
};

export default Navbar;