import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import './FieldInfoEditor.css';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
      const farmName = info.farm_name || 'Unbekannt';
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
    const farmName = summary.farm_name || 'unbekannt';

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
    event.preventDefault();

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

  const handleYearChange = (e) => {
    setSelectedYear(Number(e.target.value));
  };

  const exportToPDF = () => {
    const doc = new jsPDF();

    const harvestYear = filteredFieldInfoList.length > 0 ? filteredFieldInfoList[0].year : 'N/A';
    console.log(harvestYear, " ", filteredFieldInfoList);

    let x = 14;
    let currentY = 10;

    doc.setFontSize(16);
    doc.setFont("helvetica", 'bold');
    doc.text("Erntejahr " + harvestYear, x, currentY);
    doc.setFont("helvetica", 'normal');

    const farms = [...new Set(filteredFieldInfoList.map(info => info.farm_name))];
    const fruits = [...new Set(filteredFieldInfoList.map(info => info.crop_name))];

    const summaryRows = fruits.map(fruit => {
      const row = [fruit];
      let fruitTotal = 0;

      farms.forEach(farm => {
        const totalSize = filteredFieldInfoList.filter(info => info.farm_name === farm && info.crop_name === fruit)
          .reduce((sum, info) => sum + parseFloat(info.field_size), 0);
        row.push(totalSize > 0 ? totalSize.toFixed(2) + ' ha' : '-');
        fruitTotal += totalSize;
      });
      row.push(fruitTotal.toFixed(2) + " ha");
      return row;
    });

    const farmTotals = farms.map(farm => {
      const farmTotal = filteredFieldInfoList.filter(info => info.farm_name === farm).reduce((sum, info) => sum + parseFloat(info.field_size), 0);
      return farmTotal.toFixed(2) + " ha";
    });

    const totalHeader = ['Summe'];
    const farmSummaryRow = ['Summe', ...farmTotals, (filteredFieldInfoList.reduce((sum, info) => sum + parseFloat(info.field_size), 0)).toFixed(2) + " ha"];
    const summaryColumnHeaders = ['Frucht', ...farms, totalHeader];

    autoTable(doc, {
      head: [summaryColumnHeaders],
      body: [...summaryRows, farmSummaryRow],
      startY: currentY+5,
      didParseCell: function (data) {
        if (data.row.index === summaryRows.length) {
          data.cell.styles.fontStyle = 'bold';
        }

        if (data.column.index === summaryColumnHeaders.length - 1) {
          data.cell.styles.fontStyle = 'bold';
        }
      },
      didDrawPage: function (data) {
        currentY = data.cursor.y;
      },
    });

    let currentFarm = "";
    let currentCrop = "";

    let rows = null;
    filteredFieldInfoList.forEach((info) => {
      if (currentFarm !== info.farm_name) {
        if (rows !== null) {
          autoTable(doc, {
            head: [['Name', 'Fläche']],
            body: rows,
            startY: currentY + 2,
            didDrawPage: function (data) {
              currentY = data.cursor.y;
            },
          });
        }
        rows = null;

        currentFarm = info.farm_name;

        let infos = filteredFieldInfoList.slice();
        doc.setFont("helvetica", 'bold');
        doc.text(currentFarm + ": " + (infos.filter(info => info.farm_name === currentFarm).reduce((total, info) => total + info.field_size, 0)).toFixed(2) + " ha", x, currentY += 15);
        doc.setFont("helvetica", 'normal');
      }
      if (currentCrop !== info.crop_name) {
        currentCrop = info.crop_name;

        currentY += 2;
        
        if (rows !== null) {
          autoTable(doc, {
            head: [['Name', 'Fläche']],
            body: rows,
            startY: currentY,
            didDrawPage: function (data) {
              currentY = data.cursor.y;
            },
          });
        }
        //TODO change layout

        rows = [];

        doc.setFont("helvetica", 'italic');
        
        let infos = filteredFieldInfoList.slice();
        let size = 0;
        infos.forEach(info => {
          if(info.farm_name === currentFarm && info.crop_name === currentCrop) size += info.field_size;
        });

        doc.text(currentCrop + " - " + size.toFixed(2) + " ha", x, currentY += 10);
        doc.setFont("helvetica", 'normal');
      }

      rows.push([[info.field_name], [info.field_size + " ha"]]);
    });

    autoTable(doc, {
      head: [['Name', 'Fläche']],
      body: rows,
      startY: currentY + 2,
    });

    doc.save("erntejahr_" + harvestYear + ".pdf");
  }

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

              <button onClick={exportToPDF} style={{ marginLeft: 'auto' }}> Exportieren</button>
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