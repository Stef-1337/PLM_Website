import React, { useState, useRef, useEffect } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

const SaveDropdown = ({ darkMode, filteredTasks }) => {
  const formatDuration = (durationInSeconds) => {
    const hours = Math.floor(durationInSeconds / 3600);
    const minutes = Math.floor((durationInSeconds % 3600) / 60);
    const seconds = durationInSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
  
    const fontSize = 10;
    doc.setFontSize(fontSize);
  
    const title = 'Auftragsliste';
  
    const headers = [
      { label: 'Feld', key: 'field', width: 25 },
      { label: 'Fahrzeug', key: 'vehicle', width: 25 },
      { label: 'Anbaugerät', key: 'attachment', width: 25 },
      { label: 'Beschreibung', key: 'description', width: 50 },
      { label: 'Datum', key: 'beginDate', width: 25 },
      { label: 'Dauer', key: 'duration', width: 25 },
    ];
  
    let tableRows = [];
  
    filteredTasks.forEach((task) => {
      const rowData = {
        field: task.field ? task.field.name : 'Error',
        vehicle: task.vehicle ? task.vehicle.name : 'Error',
        attachment: task.attachment ? task.attachment.name : 'Error',
        description: task.description || 'No description',
        beginDate: task.beginDate ? task.beginDate.toLocaleString('de-DE') : 'N/A',
        duration: formatDuration(task.duration),
      };
      tableRows.push(rowData);
    });
  
    const tableConfig = {
      head: [headers.map(header => header.label)],
      body: tableRows.map(row => headers.map(header => row[header.key])),
      startY: 30,
      styles: {
        cellPadding: 2,
        fontSize: fontSize,
        valign: 'middle',
        overflow: 'linebreak',
        lineColor: [0, 0, 0],
        lineWidth: 0.1,
      },
      columnStyles: {
        0: { cellWidth: headers[0].width },
        1: { cellWidth: headers[1].width },
        2: { cellWidth: headers[2].width },
        3: { cellWidth: headers[3].width },
        4: { cellWidth: headers[4].width },
        5: { cellWidth: headers[5].width },
      },
      margin: { top: 20, left: 14, right: 14 },
      didDrawPage: function (data) {
        if (data.pageNumber === 1) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(fontSize + 2);
          doc.text(title, data.settings.margin.left, 20);
        }
      },
      didDrawCell: function (data) {
        const pageHeight = doc.internal.pageSize.height;
        const cellHeight = data.row.raw.height / doc.internal.scaleFactor; 
        const remainingPageSpace = pageHeight - data.cursor.y;
        if (cellHeight > remainingPageSpace && data.pageNumber !== doc.getNumberOfPages()) {
          doc.addPage();
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(fontSize + 2);
          doc.text(title, data.settings.margin.left, 10);
          tableConfig.startY = 20;
          data.cursor.y = tableConfig.startY;
        }
      },
    };
  
    doc.autoTable(tableConfig);
  
    const pdfBlob = doc.output('blob');
  
    const pdfUrl = URL.createObjectURL(pdfBlob);
  
    window.open(pdfUrl, '_blank');
  
    setIsOpen(false);
  };
  
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
  
    const wsData = [
      ['Feld', 'Fahrzeug', 'Anbaugerät', 'Beschreibung', 'Datum', 'Dauer'], 
      ...filteredTasks.map((task) => [
        task.field ? task.field.name : 'Error',
        task.vehicle ? task.vehicle.name : 'Error',
        task.attachment ? task.attachment.name : 'Error',
        task.description || 'No description',
        task.beginDate ? task.beginDate.toLocaleString('de-DE') : 'N/A',
        formatDuration(task.duration),
      ]),
    ];
  
    const ws = XLSX.utils.aoa_to_sheet(wsData);
  
    // Adjust column widths based on content length
    const colWidths = wsData[0].map((col, i) => {
      const maxLength = Math.max(...wsData.map(row => String(row[i]).length));
      return { wch: maxLength + 5 }; // Add extra width for padding
    });
  
    ws['!cols'] = colWidths;
  
    // Apply bold style to header row
    const headerStyle = {
      font: { bold: true },
    };
  
    // Loop through each cell in the header row and apply bold style
    for (let i = 0; i < wsData[0].length; i++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: i });
      if (!ws[cellAddress]) continue;
      ws[cellAddress].s = headerStyle;
    }
  
    XLSX.utils.book_append_sheet(wb, ws, 'Auftragsliste');
  
    XLSX.writeFile(wb, 'auftragsliste.xlsx');
  
    setIsOpen(false);
  };

  const dropdownStyle = {
    position: 'absolute',
    top: 'calc(100% + 10px)',
    left: '0',
    backgroundColor: darkMode ? '#666' : '#fff',
    color: darkMode ? '#ddd' : '#333',
    border: '1px solid',
    borderColor: darkMode ? '#777' : '#ccc',
    borderRadius: '4px',
    padding: '8px',
    zIndex: '100',
  };

  return (
    <div className="save-dropdown" style={{ position: 'relative', display: 'inline-block' }}>
      <button onClick={toggleDropdown}>
        Speichern
      </button>
      {isOpen && (
        <div ref={dropdownRef} style={dropdownStyle} className="dropdown-content">
          <button onClick={handleExportPDF}>Als PDF speichern</button>
          <button onClick={handleExportExcel}>Als Excel herunterladen</button>
        </div>
      )}
    </div>
  );
};

export default SaveDropdown;