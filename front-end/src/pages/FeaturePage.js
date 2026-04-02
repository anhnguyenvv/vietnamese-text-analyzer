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
import { FiVolume2 } from "react-icons/fi";
import "./FeaturePage.css";
import StatisticsTool from "./Folder_Features/StatisticsTool";
import PreprocessingTool from "./Folder_Features/PreprocessingTool";
import SentimentAnalysisTool from "./Folder_Features/SentimentAnalysisTool";
import SummarizationTool from "./Folder_Features/SummarizationTool";
import ClassificationTool from "./Folder_Features/ClassificationTool";
import NamedEntityTool from "./Folder_Features/NamedEntityTool";
import PosTaggingTool from "./Folder_Features/PosTaggingTool";
import TextToSpeechTool from "./Folder_Features/TextToSpeechTool";

const options = [
  { value: "thong-ke", label: "Thống kê", icon: <MdOutlineInsertChart /> },
  { value: "tien-xu-ly", label: "Tiền xử lý", icon: <MdCleaningServices /> },
  { value: "gan-nhan", label: "Gán nhãn từ loại", icon: <FaTags /> },
  { value: "ner", label: "Gán nhãn thực thể có tên", icon: <BiBrain /> },
  { value: "cam-xuc", label: "Phân tích cảm xúc", icon: <BsEmojiSmile /> },
  { value: "phan-loai", label: "Phân loại", icon: <MdOutlineCategory /> },
  { value: "tom-tat", label: "Tóm tắt", icon: <HiOutlineDocumentText /> },
  { value: "chuyen-giong-noi", label: "Chuyển giọng nói", icon: <FiVolume2 /> },
];

const FeaturePage = () => {
  const [selectedOption, setSelectedOption] = useState("thong-ke");
  const [showSidebar, setShowSidebar] = useState(true);
  const [sharedTextInput, setSharedTextInput] = useState("");
  const [sharedFile, setSharedFile] = useState(null);

  // Truyền props xuống các màn
  const renderMainContent = () => {
    const sharedProps = {
      sharedTextInput,
      setSharedTextInput,
      sharedFile,
      setSharedFile,
    };
    switch (selectedOption) {
      case "thong-ke":
        return <StatisticsTool {...sharedProps} />;
      case "tien-xu-ly":
        return <PreprocessingTool {...sharedProps} />;
      case "cam-xuc":
        return <SentimentAnalysisTool {...sharedProps} />;
      case "tom-tat":
        return <SummarizationTool {...sharedProps} />;
      case "ner":
        return <NamedEntityTool {...sharedProps} />;
      case "gan-nhan":
        return <PosTaggingTool {...sharedProps} />;
      case "phan-loai":
        return <ClassificationTool {...sharedProps} />;
      case "chuyen-giong-noi":
        return <TextToSpeechTool {...sharedProps} />;
      default:
        return null;
    }
  };

  return (
    <div className="feature-container feature-page-layout">
      {showSidebar && (
        <nav className="sidebar feature-sidebar">
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
            className="sidebar-toggle-btn"
            onClick={() => setShowSidebar(false)}
            title="Ẩn chức năng"
          >
            <FaChevronLeft />
          </button>
        </nav>
      )}
      {!showSidebar && (
        <button
          className="sidebar-open-btn"
          onClick={() => setShowSidebar(true)}
          title="Hiện chức năng"
        >
          <FaChevronRight />
        </button>
      )}
      <div className="content feature-content">
        {renderMainContent()}
      </div>
    </div>
  );
};

export default FeaturePage;
