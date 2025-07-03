// FeaturePage.js
import React, { useState } from "react";
import {
  MdOutlineInsertChart,      // Thống kê văn bản
  MdCleaningServices,          // Tiền xử lý
  MdOutlineCategory          // Phân loại
} from "react-icons/md";
import { FaTags } from "react-icons/fa";                 // Gán nhãn từ loại
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
  { value: "thong-ke", label: "Thống kê văn bản", icon: <MdOutlineInsertChart /> },
  { value: "tien-xu-ly", label: "Tiền xử lý", icon: <MdCleaningServices /> },
  { value: "gan-nhan", label: "Gán nhãn từ loại", icon: <FaTags /> },
  { value: "ner", label: "Thực thể có tên", icon: <BiBrain /> },
  { value: "cam-xuc", label: "Cảm xúc", icon: <BsEmojiSmile /> },
  { value: "phan-loai", label: "Phân loại", icon: <MdOutlineCategory /> },
  { value: "tom-tat", label: "Tóm tắt văn bản", icon: <HiOutlineDocumentText /> },
];

const FeaturePage = () => {
  const [selectedOption, setSelectedOption] = useState("thong-ke");


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
    <div className="feature-container">
      <nav className="sidebar">
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
      </nav>

      <div className="content">{renderMainContent()}</div>
    </div>
  );
};

export default FeaturePage;
