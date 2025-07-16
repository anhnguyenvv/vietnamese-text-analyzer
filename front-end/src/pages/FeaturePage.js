// FeaturePage.js
import React, { useState } from "react";
import {
  MdOutlineInsertChart,      // Thống kê văn bản
  MdCleaningServices,          // Tiền xử lý
  MdOutlineCategory          // Phân loại
} from "react-icons/md";
import { FaTags } from "react-icons/fa";                 // Gán nhãn từ loại
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { BiBrain } from "react-icons/bi";                // Thực thể có tên
import { BsEmojiSmile } from "react-icons/bs";           // Cảm xúc
import { HiOutlineDocumentText } from "react-icons/hi";  // Tóm tắt văn bản
import "./FeaturePage.css";
import StatisticsTool from "./Folder_Features/StatisticsTool";
import PreprocessingTool from "./Folder_Features/PreprocessingTool";
import SentimentAnalysisTool from "./Folder_Features/SentimentAnalysisTool";
import SummarizationTool from "./Folder_Features/SummarizationTool";
import ClassificationTool from "./Folder_Features/ClassificationTool";
import NamedEntityTool from "./Folder_Features/NamedEntityTool";
import PosTaggingTool from "./Folder_Features/PosTaggingTool";

const options = [
  { value: "thong-ke", label: "Thống kê", icon: <MdOutlineInsertChart /> },
  { value: "tien-xu-ly", label: "Tiền xử lý", icon: <MdCleaningServices /> },
  { value: "gan-nhan", label: "Gán nhãn từ loại", icon: <FaTags /> },
  { value: "ner", label: "Gán nhãn thực thể có tên", icon: <BiBrain /> },
  { value: "cam-xuc", label: "Phân tích cảm xúc", icon: <BsEmojiSmile /> },
  { value: "phan-loai", label: "Phân loại", icon: <MdOutlineCategory /> },
  { value: "tom-tat", label: "Tóm tắt", icon: <HiOutlineDocumentText /> },
];

const FeaturePage = () => {
  const [selectedOption, setSelectedOption] = useState("thong-ke");
  const [showSidebar, setShowSidebar] = useState(true);

  const renderMainContent = () => {
    switch (selectedOption) {
      case "thong-ke":
        return <StatisticsTool />;
      case "tien-xu-ly":
        return <PreprocessingTool />;
      case "cam-xuc":
        return <SentimentAnalysisTool />;
      case "tom-tat":
        return <SummarizationTool />;
      case "ner":
        return <NamedEntityTool />;
      case "gan-nhan":
        return <PosTaggingTool />;
      case "phan-loai":
        return <ClassificationTool />;
      default:
        return null;
    }
  };

  return (
    <div className="feature-container" style={{ display: "flex" }}>  
      {showSidebar && (
        <nav className="sidebar" style={{ position: "relative" }}>
          <h2 className="sidebar-title">Chức năng</h2>
          <ul className="sidebar-list">
            {options.map((item) => (
              <li
                key={item.value}
                className={`sidebar-item ${
                  selectedOption === item.value ? "active" : ""
                }`}
                onClick={() => setSelectedOption(item.value)}
              >
                <span className="menu-icon">{item.icon}</span>
                <span className="menu-label">{item.label}</span>
              </li>
            ))}
          </ul>
          {/* Nút ẩn sidebar dạng mũi tên */}
          <button
            style={{
              position: "absolute",
              right: -36,
              top: 24,
              zIndex: 1000,
              padding: "6px 8px",
              borderRadius: "50%",
              border: "1px solid #ccc",
              background: "#fff",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,0.07)"
            }}
            onClick={() => setShowSidebar(false)}
            title="Ẩn chức năng"
          >
            <FaChevronLeft />
          </button>
        </nav>
      )}
      {!showSidebar && (
        <button
          style={{
            position: "fixed",
            left: 0,
            top: 40,
            zIndex: 1000,
            padding: "6px 8px",
            borderRadius: "50%",
            border: "1px solid #ccc",
            background: "#fff",
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(0,0,0,0.07)"
          }}
          onClick={() => setShowSidebar(true)}
          title="Hiện chức năng"
        >
          <FaChevronRight />
        </button>
      )}
      <div
        className="content"
        style={{
          flex: 10,
          minWidth: 0,        
          marginTop: 80,
          marginLeft: 20,
          overflow: "auto",
          padding: 0,
          transition: "margin-left 0.2s"
        }}
      >
        {renderMainContent()}
      </div>
    </div>
  );
};

export default FeaturePage;
