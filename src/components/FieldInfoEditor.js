import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import './FieldInfoEditor.css';

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

  const fetchFieldInfoList = async () => {
    try {
      const response = await fetch('http://stef.local:3000/plm_fieldinfo');
      if (!response.ok) {
        throw new Error('Failed to fetch field info');
      }
      const data = await response.json();

      data.sort((a, b) => {
        if (a.field_name < b.field_name) return -1;
        if (a.field_name > b.field_name) return 1;
        return b.year - a.year;
      });

      setFieldInfoList(data);
    } catch (error) {
      console.error('Error fetching field info list:', error);
    }
  };

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

  const handleEdit = (info) => {
    setFieldInfo({
      ...info,
      begin: new Date(info.begin_date).toISOString().slice(0, 16),
      isEditing: true,
    });
    setSelectedFields([{ value: info.field_id, label: info.field_name }]);
    setIsAddingNew(true);
  };

  const handleSave = async (event) => {
    event.preventDefault(); // Prevents default form submission
  
    const payload = {
      fields: selectedFields.map(f => f.value),
      begin: fieldInfo.begin,
      year: fieldInfo.year,
      cropId: fieldInfo.cropId,
    };
  
    console.log('Payload:', payload);
  
    try {
      let response;
      if (fieldInfo.isEditing) {
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
                onChange={handleInputChange}
                required
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
            <button onClick={() => setIsAddingNew(true)}>Erntejahre hinzufügen</button>
            <br />
            <br />
            <div className="field-info-table-container">
              <h2>Vorhandene Erntejahre</h2>
              <table className="field-info-table">
                <thead>
                  <tr>
                    <th>Felder</th>
                    <th>Jahr</th>
                    <th>Start</th>
                    <th>Frucht</th>
                    <th>Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {fieldInfoList.map((info) => (
                    <tr key={info.id}>
                      <td>{info.field_name}</td>
                      <td>{info.year}</td>
                      <td>{new Date(info.begin_date).toLocaleString()}</td>
                      <td>{info.crop_name}</td><td>
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
