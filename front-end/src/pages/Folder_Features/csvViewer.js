import { useState, useEffect, useMemo } from "react";
import Papa from "papaparse";
import { Bar } from "react-chartjs-2";


const CsvViewer = ({ csvFile, onFilteredDataChange, statistics=true }) => {
    const [csvData, setCsvData] = useState([]);
    const [columnFilters, setColumnFilters] = useState({});
    const [filterPopup, setFilterPopup] = useState(null); // {colIdx, anchor}
    const [searchKeyword, setSearchKeyword] = useState("");
    const labelColumn = "label_id"; // Đổi thành tên cột nhãn bạn muốn thống kê
    
    useEffect(() => {
        if (typeof csvFile === "object" && csvFile instanceof File) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const parsed = Papa.parse(e.target.result.trim(), { skipEmptyLines: true });
            setCsvData(parsed.data);
        };
        reader.readAsText(csvFile);
        } else if (typeof csvFile === "string") {
        fetch(csvFile)
            .then(res => res.text())
            .then(text => {
            const parsed = Papa.parse(text.trim(), { skipEmptyLines: true });
            setCsvData(parsed.data);
            });
        }
    }, [csvFile]);
    
    const uniqueValuesByColumn = useMemo(() => (
        csvData.length
        ? csvData[0].map((_, colIdx) =>
            Array.from(new Set(csvData.slice(1).map(row => row[colIdx])))
            )
        : []
    ), [csvData]);

    const filteredData = useMemo(() => (
        csvData.length
        ? [
            csvData[0],
            ...csvData.slice(1).filter(row =>
                csvData[0].every((_, colIdx) =>
                !columnFilters[colIdx] || columnFilters[colIdx].length === 0
                    ? true
                    : columnFilters[colIdx].includes(row[colIdx])
                )
            ),
            ]
        : []
    ), [csvData, columnFilters]);

    useEffect(() => {
        if (onFilteredDataChange) {
        onFilteredDataChange(filteredData);
        }
    }, [filteredData, onFilteredDataChange]);

  // Popup filter cho từng cột
    const renderFilterPopup = () => {
        if (!filterPopup) return null;
        const colIdx = filterPopup.colIdx;
        const values = uniqueValuesByColumn[colIdx] || [];
        const filteredValues = values.filter(val =>
            !searchKeyword || (val && val.toString().toLowerCase().includes(searchKeyword.toLowerCase()))
        );
        return (
        <>
            <div
                style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    width: "100vw",
                    height: "100vh",
                    zIndex: 999,
                }}
                onClick={() => {
                    setFilterPopup(null);
                    setSearchKeyword("");
                }}
            />
            <div
                style={{
                position: "absolute",
                zIndex: 1000,
                background: "#fff",
                border: "1px solid #ccc",
                borderRadius: 8,
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                padding: 12,
                minWidth: 220,
                top: filterPopup.anchor?.top ?? 40,
                left: filterPopup.anchor?.left ?? 40,
                }}
            >
                <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
                <input
                    type="text"
                    placeholder="Tìm kiếm nhãn..."
                    value={searchKeyword}
                    onChange={e => setSearchKeyword(e.target.value)}
                    style={{ width: "100%", padding: "6px 8px", fontSize: 14, borderRadius: 4, border: "1px solid #ccc" }}
                />
                <span role="img" aria-label="search">🔍</span>
                </div>
                <div style={{ maxHeight: 140, overflowY: "auto", marginBottom: 8 }}>
                {filteredValues.map(val => (
                    <label key={val} style={{ display: "block", fontSize: 13, marginBottom: 4 }}>
                    <input
                        type="checkbox"
                        checked={
                        columnFilters[colIdx]
                            ? columnFilters[colIdx].includes(val)
                            : false
                        }
                        onChange={e => {
                        setColumnFilters(filters => {
                            const prev = filters[colIdx] || [];
                            let next;
                            if (e.target.checked) {
                            next = [...prev, val];
                            } else {
                            next = prev.filter(v => v !== val);
                            }
                            return { ...filters, [colIdx]: next };
                        });
                        }}
                    />{" "}
                    {val}
                    </label>
                ))}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                <button
                    style={{
                    padding: "4px 12px",
                    borderRadius: 4,
                    border: "1px solid #ccc",
                    background: "#f1f2f6",
                    cursor: "pointer",
                    fontSize: 13,
                    }}
                    onClick={() => setColumnFilters(filters => ({ ...filters, [colIdx]: [] }))}
                >
                    Clear
                </button>
                <button
                    style={{
                    padding: "4px 12px",
                    borderRadius: 4,
                    border: "1px solid #0984e3",
                    background: "#0984e3",
                    color: "#fff",
                    cursor: "pointer",
                    fontSize: 13,
                    }}
                    onClick={() => {
                    setFilterPopup(null);
                    setSearchKeyword("");
                    }}
                >
                    Apply
                </button>
                </div>
            </div>
        </>

        );
    };

    const labelStats = useMemo(() => {
        if (!filteredData.length || !filteredData[0]) return {};
        const colIdx = filteredData[0].indexOf(labelColumn);
        if (colIdx === -1) return {};
        const stats = {};
        filteredData.slice(1).forEach(row => {
            const label = row[colIdx];
            stats[label] = (stats[label] || 0) + 1;
        });
        return stats;
    }, [filteredData]);
    const barData = useMemo(() => {
        const labels = Object.keys(labelStats);
        const data = Object.values(labelStats);
        return {
            labels: labels.map(l => l || "(trống)"),
            datasets: [
                {
                    label: "Số lượng",
                    data,
                    backgroundColor: "#0984e3",
                },
            ],
        };
    }, [labelStats]);

    return (
        <div className="csv-viewer-container" style={{ 
            position: "relative"
        }}>
            <div style={{ position: "relative" }}>
            {statistics && (
            <div style={{ fontSize: 12, margin: "8px 0" }}>
                <strong>Thống kê nhãn:</strong>
                {Object.keys(labelStats).length === 0 ? (
                <span style={{ color: "#888", marginLeft: 8 }}>Không có dữ liệu.</span>
                ) : (
                <div style={{ maxWidth: 300, margin: "7px 0" }}>
                    <Bar
                    data={barData}
                    options={{
                        responsive: false,
                        maintainAspectRatio: false,
                        plugins: {
                        legend: { display: false },
                        },
                        scales: {
                        x: { title: { display: true, text: "Nhãn" } },
                        y: { title: { display: true, text: "Số lượng" }, beginAtZero: true },
                        },
                    }}
                    height={160}
                    width={300} 
                    />
                </div>
                )}
            </div>
            )}  
             <div
                style={{
                background: "#fafafa",
                border: "1px solid #eee",
                borderRadius: 4,
                padding: 8,
                fontFamily: "monospace",
                fontSize: 13,
                maxHeight: 320,
                overflow: "auto",
                marginBottom: 8,
            }}
            >
            <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                <thead>
                <tr>
                    {(csvData[0] || []).map((colName, colIdx) => (
                    <th
                        key={colIdx}
                        style={{
                        border: "1px solid #ddd",
                        padding: "4px 32px 4px 8px", // padding right lớn để tránh che chữ
                        background: "#e0e0e0",
                        fontWeight: "bold",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        minWidth: 30,
                        maxWidth: 150,
                        position: "relative",
                        textAlign: "left",
                        }}
                    >
                        <span>{colName}</span>
                        <button
                        style={{
                            position: "absolute",
                            right: 6,
                            top: "50%",
                            transform: "translateY(-50%)",
                            padding: "2px 6px",
                            borderRadius: "50%",
                            border: "1px solid #ccc",
                            background: "#f1f2f6",
                            cursor: "pointer",
                            fontSize: 13,
                            verticalAlign: "middle",
                            zIndex: 2,
                        }}
                        onClick={e => {
                            const container = e.target.closest(".csv-viewer-container");
                            const containerRect = container.getBoundingClientRect();
                            const rect = e.target.getBoundingClientRect();
                            setFilterPopup({
                            colIdx,
                            anchor: {
                                top: rect.bottom - containerRect.top,
                                left: rect.left - containerRect.left
                            }
                            });
                            setSearchKeyword("");
                        }}
                        title="Lọc dữ liệu"
                        >
                        ⏷
                        </button>
                    </th>
                    ))}
                </tr>
                </thead>
                <tbody>
                {filteredData.slice(1).map((row, idx) => (
                    <tr key={idx}>
                    {row.map((cell, cidx) => (
                        <td
                        key={cidx}
                        style={{
                            border: "1px solid #ddd",
                            padding: "4px 8px",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            width: "auto",
                            minWidth: 30,
                            maxWidth: 150,
                        }}
                        title={cell}
                        >
                        {cell}
                        </td>
                    ))}
                    </tr>
                ))}
                </tbody>
            </table>
            {renderFilterPopup()}
            </div> 

        </div>
    </div>);
};

export default CsvViewer;