import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import './FieldInfoEditor.css';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

const FieldInfoEditor = ({ fields, crops, onClose, selectStyle, fieldOptions }) => {

  const startYear = 1950;
  const endYear = 2100;
  const years = Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);

  const getCurrentDateTime = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const localISOTime = new Date(now.getTime() - offset).toISOString().slice(0, 16);
    return localISOTime;
  };

  const initialFieldInfoState = {
    id: null,
    fields: [],
    field_name: '',
    begin: getCurrentDateTime(),
    year: new Date().getFullYear(),
    cropId: '',
    crop_name: '',
    isEditing: false,
  };

  const [fieldInfo, setFieldInfo] = useState(initialFieldInfoState);
  const [fieldInfoList, setFieldInfoList] = useState([]);
  const [selectedFields, setSelectedFields] = useState([]);
  const [fieldMenuIsOpen, setFieldMenuIsOpen] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState(null);
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentSortCriteria, setCurrentSortCriteria] = useState('year');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [availableYears, setAvailableYears] = useState([]);

  const fetchFieldInfoList = async () => {
    try {
      const response = await fetch('http://stef.local:3000/plm_fieldinfo');
      if (!response.ok) {
        throw new Error('Failed to fetch field info');
      }
      const data = await response.json();

      data.sort((a, b) => b.year - a.year);

      setFieldInfoList(data);

      // Extrahiere verfügbare Jahre
      const uniqueYears = Array.from(new Set(data.map(info => info.year)));
      setAvailableYears(uniqueYears);
    } catch (error) {
      console.error('Error fetching field info list:', error);
    }
  };

  useEffect(() => {
    if (availableYears.length > 0) setSelectedYear(Math.max(...availableYears));
  }, [availableYears]);

  useEffect(() => {
    fetchFieldInfoList();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        confirmingDeleteId !== null &&
        !event.target.closest('.confirm-delete-button') &&
        !event.target.closest('.delete-button')
      ) {
        setConfirmingDeleteId(null);
      }
    };

    document.addEventListener('click', handleClickOutside);

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [confirmingDeleteId]);


  const getCropSummaries = (fieldInfoList) => {
    const cropSummary = {};

    fieldInfoList.forEach(info => {
      const farmName = info.farm_name || 'Unbekannt'; // Replace null with 'unbekannt'
      if (!cropSummary[info.farm_name]) {
        cropSummary[info.farm_name] = {};
      }

      if (!cropSummary[info.farm_name][info.crop_name]) {
        cropSummary[info.farm_name][info.crop_name] = {
          crop_name: info.crop_name,
          farm_name: farmName,
          totalFields: 0,
          totalArea: 0,
        };
      }

      cropSummary[info.farm_name][info.crop_name].totalFields += 1;
      cropSummary[info.farm_name][info.crop_name].totalArea += info.field_size;
    });

    // Flatten the structure to make it easier to render
    const summaryList = [];
    for (const farm in cropSummary) {
      for (const crop in cropSummary[farm]) {
        summaryList.push(cropSummary[farm][crop]);
      }
    }

    return summaryList;
  };

  const filteredFieldInfoList = fieldInfoList
    .filter(info => info.year === selectedYear)
    .sort((a, b) => {
      if (!a.farm_name && !b.farm_name) return 0;
      if (!a.farm_name) return 1;
      if (!b.farm_name) return -1;

      const farmComparison = a.farm_name.localeCompare(b.farm_name);
      if (farmComparison !== 0) return farmComparison;

      const cropComparison = a.crop_name.localeCompare(b.crop_name);
      if (cropComparison !== 0) return cropComparison;

      return a.field_name.localeCompare(b.field_name);
    });

  const cropSummaries = getCropSummaries(filteredFieldInfoList);

  const groupedByFarm = cropSummaries.reduce((acc, summary) => {
    const farmName = summary.farm_name || 'unbekannt'; // Replace null with 'unbekannt'

    if (!acc[farmName]) {
      acc[farmName] = {
        totalArea: 0,
        crops: []
      };
    }

    acc[farmName].totalArea += summary.totalArea;
    acc[farmName].crops.push(`${summary.crop_name} (${summary.totalFields}x) - ${summary.totalArea.toFixed(2)} ha`);

    return acc;
  }, {});

  // Convert groupedByFarm to an array for rendering
  const farmSummaryList = Object.entries(groupedByFarm).map(([farmName, { totalArea, crops }]) => ({
    farmName,
    totalArea: totalArea.toFixed(2),
    crops
  }));



  const handleEdit = (info) => {
    setFieldInfo({
      ...info,
      id: info.id,
      begin: new Date(info.begin_date).toISOString().slice(0, 16),
      isEditing: true,
    });
    setSelectedFields([{ value: info.field_id, label: info.field_name }]);
    setIsAddingNew(true);
  };

  const handleSave = async (event) => {
    event.preventDefault(); // Prevents default form submission

    console.log("sending ", selectedFields);
    const payload = {
      fields: selectedFields.map(f => f.value),
      begin: fieldInfo.begin,
      year: fieldInfo.year,
      cropId: fieldInfo.cropId,
      taskInfoId: fieldInfo.id,
    };

    console.log('Payload:', payload);

    try {
      let response;
      if (fieldInfo.isEditing) {
        console.log(fieldInfo.id, " is edited");
        response = await fetch(`http://stef.local:3000/plm_fieldinfo/${fieldInfo.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
      } else {
        response = await fetch('http://stef.local:3000/plm_fieldinfo', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
      }

      if (!response.ok) {
        const errorMessage = await response.text();
        throw new Error(fieldInfo.isEditing ? `Failed to update field info: ${errorMessage}` : `Failed to add field info: ${errorMessage}`);
      }

      console.log(fieldInfo.isEditing ? 'Field info updated successfully' : 'Field info added successfully');
      fetchFieldInfoList();

      setFieldInfo(initialFieldInfoState);
      setSelectedFields([]);
      setIsAddingNew(false);
    } catch (error) {
      console.error('Error:', error.message);
    }
  };

  const handleCancel = () => {
    setFieldInfo(initialFieldInfoState);
    setSelectedFields([]);
    setIsAddingNew(false);
  };

  const handleFieldChange = (selectedOptions) => {
    setSelectedFields(selectedOptions);
    setFieldInfo((prevInfo) => ({
      ...prevInfo,
      fields: selectedOptions.map((option) => option.value),
    }));
    setFieldMenuIsOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFieldInfo((prevInfo) => ({
      ...prevInfo,
      [name]: value,
    }));
  };

  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setFieldInfo((prevInfo) => ({
      ...prevInfo,
      [name]: value,
    }));
  };

  const handleDelete = async (id) => {
    if (deleteConfirmId !== id) {
      setDeleteConfirmId(id);
      return;
    }

    try {
      const response = await fetch(`http://stef.local:3000/plm_fieldinfo/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete field info');
      }

      console.log('Field info deleted successfully');
      fetchFieldInfoList();
      setDeleteConfirmId(null);
    } catch (error) {
      console.error('Error deleting field info:', error);
    }
  };

  const handleClose = () => {
    onClose();
    window.location.reload();
  };

  const sortFieldInfo = (criteria, order = sortOrder) => {
    setCurrentSortCriteria(criteria);

    const sortedList = [...fieldInfoList].sort((a, b) => {
      if (criteria === 'year') {
        return order === 'asc' ? a.year - b.year : b.year - a.year;
      } else if (criteria === 'name') {
        const nameComparison = order === 'desc'
          ? a.field_name.localeCompare(b.field_name)
          : b.field_name.localeCompare(a.field_name);

        if (nameComparison !== 0) return nameComparison;

        return b.year - a.year;
      }

      const cropComparison = a.crop_name.localeCompare(b.crop_name);
      if (cropComparison !== 0) return cropComparison;

      return a.field_name.localeCompare(b.field_name);
    });

    setFieldInfoList(sortedList);
  };

  const toggleSortOrder = () => {
    setSortOrder((prevOrder) => {
      const newOrder = prevOrder === 'asc' ? 'desc' : 'asc';
      sortFieldInfo(currentSortCriteria, newOrder);
      return newOrder;
    });
  };

  const handleYearChange = (e) => {
    setSelectedYear(Number(e.target.value));
  };

  //TODO show a row for each field in the detailed table
  const exportToPDF = () => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    let yPos = 10; // Starting Y position for text
    
    // Add a title to the PDF
    pdf.setFontSize(16);
    pdf.text('Field Info Summary', 10, yPos);
    
    yPos += 10; // Adjust position for summary table
    
    // Set table headers for the summary
    const headers = ['Frucht', ...farmSummaryList.map(farm => farm.farmName), 'Summe'];
    const rows = [];
    
    // Collect table rows (crops by farms and total area)
    Array.from(new Set(farmSummaryList.flatMap(farm => farm.crops.map(crop => crop.split(' ')[0])))).forEach((cropName) => {
      const row = [cropName];
      
      // Fill in farm-specific areas for each crop
      farmSummaryList.forEach((farm) => {
        const crop = farm.crops.find(crop => crop.startsWith(cropName));
        row.push(crop ? crop.split(' - ')[1] : '-');
      });
  
      // Calculate the total for this crop
      const cropTotal = farmSummaryList.reduce((sum, farm) => {
        const crop = farm.crops.find(crop => crop.startsWith(cropName));
        return sum + (crop ? parseFloat(crop.split(' - ')[1].replace(' ha', '')) : 0);
      }, 0);
      row.push(`${cropTotal.toFixed(2)} ha`);
      
      rows.push(row);
    });
    
    // Add total area row
    const totalRow = ['Gesamtfläche'];
    farmSummaryList.forEach((farm) => {
      const farmTotal = farm.crops.reduce((sum, crop) => sum + parseFloat(crop.split(' - ')[1].replace(' ha', '')), 0);
      totalRow.push(`${farmTotal.toFixed(2)} ha`);
    });
    totalRow.push(`${farmSummaryList.reduce((sum, farm) => sum + farm.crops.reduce((subSum, crop) => subSum + parseFloat(crop.split(' - ')[1].replace(' ha', '')), 0), 0).toFixed(2)} ha`);
    rows.push(totalRow);
    
    // Add summary table to PDF
    pdf.autoTable({
      head: [headers],
      body: rows,
      startY: yPos,
    });
    
    yPos += pdf.lastAutoTable.finalY + 10; // Adjust position for the next section
    
    // Add detailed tables for each farm
    farmSummaryList.forEach((farm) => {
      pdf.setFontSize(14);
      pdf.text(`Farm: ${farm.farmName}`, 10, yPos);
      
      yPos += 10; // Adjust position for table
      
      // Set table headers for the farm
      const farmHeaders = ['Fruit', 'Field', 'Size'];
      const farmRows = farm.crops.map(crop => {
        const [fieldName, area] = crop.split(' - ');
        const fruit = crop.split(' ')[0]; // Assuming the fruit is the first part of the string
        return [fruit, fieldName, area];
      });
  
      // Add farm table to PDF
      pdf.autoTable({
        head: [farmHeaders],
        body: farmRows,
        startY: yPos,
        margin: { left: 10 },
      });
      
      yPos += pdf.lastAutoTable.finalY + 10; // Adjust position for the next section
    });
    
    // Save the PDF
    pdf.save('field_info_summary.pdf');
  };
  
  /*
  const exportToPDF = () => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    let yPos = 10; // Starting Y position for text
    
    // Add a title to the PDF
    pdf.setFontSize(16);
    pdf.text('Field Info Summary', 10, yPos);
    
    yPos += 10; // Adjust position for summary table
    
    // Set table headers for the summary
    const headers = ['Frucht', ...farmSummaryList.map(farm => farm.farmName), 'Summe'];
    const rows = [];
    
    // Collect table rows (crops by farms and total area)
    Array.from(new Set(farmSummaryList.flatMap(farm => farm.crops.map(crop => crop.split(' ')[0])))).forEach((cropName) => {
      const row = [cropName];
      
      // Fill in farm-specific areas for each crop
      farmSummaryList.forEach((farm) => {
        const crop = farm.crops.find(crop => crop.startsWith(cropName));
        row.push(crop ? crop.split(' - ')[1] : '-');
      });
  
      // Calculate the total for this crop
      const cropTotal = farmSummaryList.reduce((sum, farm) => {
        const crop = farm.crops.find(crop => crop.startsWith(cropName));
        return sum + (crop ? parseFloat(crop.split(' - ')[1].replace(' ha', '')) : 0);
      }, 0);
      row.push(`${cropTotal.toFixed(2)} ha`);
      
      rows.push(row);
    });
    
    // Add total area row
    const totalRow = ['Gesamtfläche'];
    farmSummaryList.forEach((farm) => {
      const farmTotal = farm.crops.reduce((sum, crop) => sum + parseFloat(crop.split(' - ')[1].replace(' ha', '')), 0);
      totalRow.push(`${farmTotal.toFixed(2)} ha`);
    });
    totalRow.push(`${farmSummaryList.reduce((sum, farm) => sum + farm.crops.reduce((subSum, crop) => subSum + parseFloat(crop.split(' - ')[1].replace(' ha', '')), 0), 0).toFixed(2)} ha`);
    rows.push(totalRow);
    
    // Add summary table to PDF
    pdf.autoTable({
      head: [headers],
      body: rows,
      startY: yPos,
    });
    
    yPos += pdf.lastAutoTable.finalY + 10; // Adjust position for the next table
    
    // Add individual tables for each farm
    farmSummaryList.forEach((farm) => {
      pdf.setFontSize(14);
      pdf.text(`Farm: ${farm.farmName}`, 10, yPos);
      
      yPos += 10; // Adjust position for table
      
      // Set table headers for the farm
      const farmHeaders = ['Field', 'Area'];
      const farmRows = farm.crops.map(crop => {
        const [fieldName, area] = crop.split(' - ');
        return [fieldName, area];
      });
  
      // Add farm table to PDF
      pdf.autoTable({
        head: [farmHeaders],
        body: farmRows,
        startY: yPos,
      });
      
      yPos += pdf.lastAutoTable.finalY + 10; // Adjust position for the next table
    });
    
    // Save the PDF
    pdf.save('field_info_summary.pdf');
  };

  /*
  const exportToPDF = () => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    let yPos = 10; // Starting Y position for text
  
    // Add a title to the PDF
    pdf.setFontSize(16);
    pdf.text('Field Info Summary', 10, yPos);
  
    yPos += 10; // Adjust position for table
  
    // Set table headers
    const headers = ['Frucht', ...farmSummaryList.map(farm => farm.farmName), 'Summe'];
    const rows = [];
  
    // Collect table rows (crops by farms and total area)
    Array.from(new Set(farmSummaryList.flatMap(farm => farm.crops.map(crop => crop.split(' ')[0])))).forEach((cropName) => {
      const row = [cropName];
  
      // Fill in farm-specific areas for each crop
      farmSummaryList.forEach((farm) => {
        const crop = farm.crops.find(crop => crop.startsWith(cropName));
        row.push(crop ? crop.split(' - ')[1] : '-');
      });
  
      // Calculate the total for this crop
      const cropTotal = farmSummaryList.reduce((sum, farm) => {
        const crop = farm.crops.find(crop => crop.startsWith(cropName));
        return sum + (crop ? parseFloat(crop.split(' - ')[1].replace(' ha', '')) : 0);
      }, 0);
      row.push(`${cropTotal.toFixed(2)} ha`);
  
      rows.push(row);
    });
  
    // Add total area row
    const totalRow = ['Gesamtfläche'];
    farmSummaryList.forEach((farm) => {
      const farmTotal = farm.crops.reduce((sum, crop) => sum + parseFloat(crop.split(' - ')[1].replace(' ha', '')), 0);
      totalRow.push(`${farmTotal.toFixed(2)} ha`);
    });
    totalRow.push(`${farmSummaryList.reduce((sum, farm) => sum + farm.crops.reduce((subSum, crop) => subSum + parseFloat(crop.split(' - ')[1].replace(' ha', '')), 0), 0).toFixed(2)} ha`);
    rows.push(totalRow);
  
    // Add the summary table to PDF
    pdf.autoTable({
      head: [headers],
      body: rows,
      startY: yPos,
    });
  
    // Move Y position after the summary table
    yPos = pdf.lastAutoTable.finalY + 10;
  
    // Loop through each farm to create detailed tables below the summary
    farmSummaryList.forEach((farm) => {
      // Check if fields exist; if not, set to an empty array
      const fields = farm.fields || [];
  
      if (yPos + 50 > pdf.internal.pageSize.height) {
        pdf.addPage(); // Add a new page if space is running out
        yPos = 10;
      }
  
      // Add farm name as a sub-heading
      pdf.setFontSize(14);
      pdf.text(`Betrieb: ${farm.farmName}`, 10, yPos);
      yPos += 10;
  
      // Set detailed table headers for the farm
      const farmTableHeaders = ['Frucht', 'Feld', 'Fläche'];
      const farmTableRows = [];
  
      // Loop through each crop and field to fill rows
      farm.crops.forEach((crop) => {
        const [cropName, cropArea] = crop.split(' - ');
  
        // Safely access the fields and sort them
        fields
          .filter(field => field.crop === cropName) // Only filter if fields exist
          .sort((a, b) => a.field_name.localeCompare(b.field_name)) // Sort fields alphabetically
          .forEach(field => {
            farmTableRows.push([cropName, field.field_name, `${field.field_size} ha`]);
          });
      });
  
      // Add the detailed farm table to the PDF
      pdf.autoTable({
        head: [farmTableHeaders],
        body: farmTableRows,
        startY: yPos,
      });
  
      // Move Y position after each farm table
      yPos = pdf.lastAutoTable.finalY + 10;
    });
  
    // Save the final PDF
    pdf.save('field_info_summary_and_farm_details.pdf');
  };

  /*
  const exportToPDF = () => {
    const doc = new jsPDF();
  
    // Sort the field info by farm_name, crop_name, and field_name
    const sortedFieldInfoList = [...filteredFieldInfoList].sort((a, b) => {
      if (a.farm_name !== b.farm_name) return a.farm_name.localeCompare(b.farm_name);
      if (a.crop_name !== b.crop_name) return a.crop_name.localeCompare(b.crop_name);
      return a.field_name.localeCompare(b.field_name);
    });
  
    // Create the summary table
    const tableColumn = ['Betrieb', 'Jahr', 'Frucht', 'Feld', 'Fläche'];
    const tableRows = [];
  
    sortedFieldInfoList.forEach(info => {
      const infoData = [
        info.farm_name,
        info.year,
        info.crop_name,
        info.field_name,
        `${info.field_size} ha`
      ];
      tableRows.push(infoData);
    });
  
    // First table with column headers
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 10, // start 10 units from the top
    });
  
    // Add a second table that shows all fields sorted by farm, fruit, and field
    let currentFarm = null;
    let currentCrop = null;
  
    sortedFieldInfoList.forEach((info, index) => {
      if (info.farm_name !== currentFarm) {
        doc.addPage(); // New page for each new farm
        currentFarm = info.farm_name;
        currentCrop = null; // Reset crop for the new farm
  
        // Add farm name as a heading
        doc.text(`Betrieb: ${info.farm_name}`, 14, 20);
  
        autoTable(doc, {
          head: [tableColumn],
          body: [], // Empty body to show the farm first
          startY: 30,
        });
      }
  
      if (info.crop_name !== currentCrop) {
        currentCrop = info.crop_name;
  
        // Add crop name as a sub-heading under the farm
        doc.text(`Frucht: ${info.crop_name}`, 14, doc.lastAutoTable.finalY + 10);
  
        autoTable(doc, {
          head: [tableColumn],
          body: [], // Empty body to indicate the new crop
          startY: doc.lastAutoTable.finalY + 20,
        });
      }
  
      // Add field details under each crop
      const fieldRow = [
        info.farm_name,
        info.year,
        info.crop_name,
        info.field_name,
        `${info.field_size} ha`,
      ];
  
      autoTable(doc, {
        body: [fieldRow],
        startY: doc.lastAutoTable.finalY + 10,
      });
    });
  
    // Save the PDF
    doc.save('field_info_sorted.pdf');
  };

  /*
  const exportToPDF = () => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    let yPos = 10; // Starting Y position for text
  
    // Add a title to the PDF
    pdf.setFontSize(16);
    pdf.text('Field Info Summary', 10, yPos);
  
    yPos += 10; // Adjust position for table
  
    // Set table headers
    const headers = ['Frucht', ...farmSummaryList.map(farm => farm.farmName), 'Summe'];
    const rows = [];
  
    // Collect table rows (crops by farms and total area)
    Array.from(new Set(farmSummaryList.flatMap(farm => farm.crops.map(crop => crop.split(' ')[0])))).forEach((cropName) => {
      const row = [cropName];
      
      // Fill in farm-specific areas for each crop
      farmSummaryList.forEach((farm) => {
        const crop = farm.crops.find(crop => crop.startsWith(cropName));
        row.push(crop ? crop.split(' - ')[1] : '-');
      });
  
      // Calculate the total for this crop
      const cropTotal = farmSummaryList.reduce((sum, farm) => {
        const crop = farm.crops.find(crop => crop.startsWith(cropName));
        return sum + (crop ? parseFloat(crop.split(' - ')[1].replace(' ha', '')) : 0);
      }, 0);
      row.push(`${cropTotal.toFixed(2)} ha`);
  
      rows.push(row);
    });
  
    // Add total area row
    const totalRow = ['Gesamtfläche'];
    farmSummaryList.forEach((farm) => {
      const farmTotal = farm.crops.reduce((sum, crop) => sum + parseFloat(crop.split(' - ')[1].replace(' ha', '')), 0);
      totalRow.push(`${farmTotal.toFixed(2)} ha`);
    });
    totalRow.push(`${farmSummaryList.reduce((sum, farm) => sum + farm.crops.reduce((subSum, crop) => subSum + parseFloat(crop.split(' - ')[1].replace(' ha', '')), 0), 0).toFixed(2)} ha`);
    rows.push(totalRow);
  
    // Add table to PDF
    pdf.autoTable({
      head: [headers],
      body: rows,
      startY: yPos,
    });
  
    pdf.save('field_info_summary.pdf');
  };

  /*
  const exportToPDF = () => {
    const container = document.querySelector('.field-info-table-container'); 
  
    const startColumnIndex = 6; 
    const actionsColumnIndex = 7;
  
    const startColumnHeader = document.querySelector(`.field-info-table thead th:nth-child(${startColumnIndex})`);
    const actionsColumnHeader = document.querySelector(`.field-info-table thead th:nth-child(${actionsColumnIndex})`);
  
    const startColumnCells = document.querySelectorAll(`.field-info-table tbody tr td:nth-child(${startColumnIndex})`);
    const actionsColumnCells = document.querySelectorAll(`.field-info-table tbody tr td:nth-child(${actionsColumnIndex})`);
  
    if (container) {
      if (startColumnHeader) startColumnHeader.style.display = 'none';
      if (actionsColumnHeader) actionsColumnHeader.style.display = 'none';
      startColumnCells.forEach(cell => cell.style.display = 'none');
      actionsColumnCells.forEach(cell => cell.style.display = 'none');
  
      html2canvas(container, { useCORS: true }).then((canvas) => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgWidth = 210; 
        const pageHeight = 295; 
        const imgHeight = canvas.height * imgWidth / canvas.width;
        let heightLeft = imgHeight;
  
        let position = 0;
  
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
  
        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }
  
        pdf.save('field_info_summary.pdf');
  
        if (startColumnHeader) startColumnHeader.style.display = '';
        if (actionsColumnHeader) actionsColumnHeader.style.display = '';
        startColumnCells.forEach(cell => cell.style.display = '');
        actionsColumnCells.forEach(cell => cell.style.display = '');
      }).catch((error) => {
        console.error('Error generating PDF:', error);
      });
    } else {
      console.error('Element not found');
    }
  };
  */

  return (
    <div className="popup">
      <div className="popup-inner">
        <div className="header">
          <h2>Erntejahre</h2>
          <button className="close-button" onClick={handleClose}>X</button>
        </div>

        {isAddingNew || fieldInfo.isEditing ? (
          <form onSubmit={handleSave}>
            <label>
              Felder:
              <div>
                <Select
                  value={selectedFields}
                  isMulti
                  name="fields"
                  options={fieldOptions}
                  className="basic-multi-select"
                  classNamePrefix="select"
                  styles={selectStyle}
                  onChange={handleFieldChange}
                  placeholder="Felder wählen"
                  components={{}}
                  isSearchable={false}
                  closeMenuOnSelect={false}
                  onBlurResetsInput={false}
                  menuIsOpen={fieldMenuIsOpen}
                  onMenuClose={() => setFieldMenuIsOpen(false)}
                  onMenuOpen={() => setFieldMenuIsOpen(true)}
                  required
                  isDisabled={fieldInfo.isEditing}
                />
              </div>
            </label>
            <br />
            <label>
              Startdatum:
              <input
                type="datetime-local"
                name="begin"
                value={fieldInfo.begin}
                onChange={handleDateChange}
                required
              />
            </label>
            <br />
            <label>
              Erntejahr:
              <select
                name="year"
                value={fieldInfo.year}
                onChange={fieldInfo.isEditing ? null : handleInputChange}
                required
                disabled={fieldInfo.isEditing}
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>
            <br />
            <label>
              Frucht:
              <select
                name="cropId"
                value={fieldInfo.cropId}
                onChange={(e) => setFieldInfo({ ...fieldInfo, cropId: e.target.value })}
                required
              >
                <option value="">Bitte wählen...</option>
                {crops.map((crop) => (
                  <option key={crop.value} value={crop.value}>
                    {crop.label}
                  </option>
                ))}
              </select>
            </label>
            <br />
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px' }}>
              <button style={{ marginRight: '10px' }} type="submit">
                {fieldInfo.isEditing ? 'Speichern' : 'Hinzufügen'}
              </button>
              <button style={{ marginRight: '10px' }} onClick={handleCancel}>
                Abbruch
              </button>
            </div>
          </form>
        ) : (
          <>
            <button onClick={() => setIsAddingNew(true)}>Erntejahr hinzufügen</button>
            <br />
            <br />
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <label>Erntejahr auswählen: </label>
              <select onChange={handleYearChange} style={{ marginLeft: '10px' }} value={selectedYear}>
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>

              <button onClick={exportToPDF} style={{ marginLeft: 'auto' }}> {/*TODO*/}Exportieren</button>
            </div>
            <br />
            <div className="field-info-table-container">
              <h2>Vorhandene Kulturen - {selectedYear}</h2>
              <table className="farm-summary-table">
                <thead>
                  <tr>
                    <th>Frucht</th>
                    {farmSummaryList.map((farm) => (
                      <th key={farm.farmName}>{farm.farmName}</th>
                    ))}
                    <th>Summe</th>
                  </tr>
                </thead>
                <tbody>
                  {farmSummaryList.length > 0 ? (
                    // Collect all unique crops to display in rows
                    Array.from(new Set(farmSummaryList.flatMap(farm => farm.crops.map(crop => crop.split(' ')[0])))).map((cropName, idx) => {
                      const cropTotal = farmSummaryList.reduce((sum, farm) => {
                        const crop = farm.crops.find(crop => crop.startsWith(cropName));
                        return sum + (crop ? parseFloat(crop.split(' - ')[1].replace(' ha', '')) : 0);
                      }, 0);

                      return (
                        <tr key={idx}>
                          <td>{cropName}</td>
                          {farmSummaryList.map((farm) => {
                            const crop = farm.crops.find(crop => crop.startsWith(cropName));
                            return <td key={farm.farmName}>{crop ? crop.split(' - ')[1] : '-'}</td>;
                          })}
                          <td>{cropTotal.toFixed(2)} ha</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={farmSummaryList.length + 2}>Keine Daten verfügbar</td>
                    </tr>
                  )}
                  <tr>
                    <td><strong>Gesamtfläche</strong></td>
                    {farmSummaryList.map((farm) => {
                      const farmTotal = farm.crops.reduce((sum, crop) => sum + parseFloat(crop.split(' - ')[1].replace(' ha', '')), 0);
                      return <td key={farm.farmName}><strong>{farmTotal.toFixed(2)} ha</strong></td>;
                    })}
                    <td><strong>{farmSummaryList.reduce((sum, farm) => sum + farm.crops.reduce((subSum, crop) => subSum + parseFloat(crop.split(' - ')[1].replace(' ha', '')), 0), 0).toFixed(2)} ha</strong></td>
                  </tr>
                </tbody>
              </table>
              {/*
              <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center' }}>
                <label>Sortieren nach: </label>
                <select onChange={(e) => sortFieldInfo(e.target.value)} style={{ marginLeft: '10px' }}>
                  <option value="year">Erntejahr</option>
                  <option value="name">Name</option>
                </select>
                <button onClick={toggleSortOrder} style={{ marginLeft: '10px' }}>
                  {sortOrder === 'asc' ? 'Aufsteigend' : 'Absteigend'}
                </button>
              </div>
              */}
              <table className="field-info-table">
                <thead>
                  <tr>
                    <th>Betrieb</th>
                    <th>Jahr</th>
                    <th>Frucht</th>
                    <th>Feld</th>
                    <th>Fläche</th>
                    <th>Start</th>
                    <th>Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFieldInfoList.map((info) => (
                    <tr key={info.id}>
                      <td>{info.farm_name}</td>
                      <td>{info.year}</td>
                      <td>{info.crop_name}</td>
                      <td>{info.field_name}</td>
                      <td>{info.field_size} ha</td>
                      <td>{new Date(info.begin_date).toLocaleString()}</td>
                      <td>
                        <button onClick={() => handleEdit(info)}>Bearbeiten</button>
                        {confirmingDeleteId === info.id ? (
                          <button
                            className="confirm-delete-button"
                            onClick={() => handleDelete(info.id)}
                            style={{ color: 'white', backgroundColor: 'red' }}
                          >
                            Bestätigen
                          </button>
                        ) : (
                          <button className="delete-button" onClick={() => setConfirmingDeleteId(info.id)}>Löschen</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
  
};

export default FieldInfoEditor;