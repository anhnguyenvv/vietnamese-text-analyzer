import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import HomePage from "./pages/HomePage";
import FeaturePage from "./pages/FeaturePage";
import FeedbackPage from "./pages/FeedbackPage";



function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/tinh-nang" element={<FeaturePage />} />
        {/* <Route path="/tac-gia" element={<div>Tác giả</div>} /> */}
        <Route path="/phan-hoi" element={<div><FeedbackPage /></div>} />
      </Routes>  
    </Router>
  );
}

export default App;
