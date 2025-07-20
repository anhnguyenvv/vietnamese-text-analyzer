
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
{/* <NavLink
to="/tac-gia"
className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}
>
Tác giả
</NavLink> */}
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