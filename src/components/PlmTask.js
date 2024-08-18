import React, { useState, useEffect } from 'react';
import Select, { components } from 'react-select';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

import DarkModeToggle from './DarkModeToggle';
import SaveDropdown from './SaveDropdown';
import TaskDetails from './TaskDetails';
import FieldInfoEditor from './FieldInfoEditor';

import './PlmTask.css';

const SelectAllCheckbox = (props) => {
  return (
    <components.Option {...props}>
      <input
        type="checkbox"
        checked={props.isSelected}
        onChange={() => null}
      />{" "}
      <label>{props.label}</label>
    </components.Option>
  );
};

const SelectAllOption = {
  label: "Alle auswählen",
  value: "*"
};

const isSelectAllSelected = (selected) =>
  selected.length > 0 && selected[0].value === "*";

const PlmTask = ({ darkMode, toggleDarkMode }) => {
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [sortedTasks, setSortedTasks] = useState([]);// eslint-disable-next-line
  const [vehicles, setVehicles] = useState([]);// eslint-disable-next-line
  const [attachments, setAttachments] = useState([]);// eslint-disable-next-line
  const [fields, setFields] = useState([]);
  const [filteredFieldOptions, setFilteredFieldOptions] = useState([]);
  // eslint-disable-next-line
  const [farms, setFarms] = useState([]);
  const [sortOption, setSortOption] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedVehicles, setSelectedVehicles] = useState([]);
  const [selectedAttachments, setSelectedAttachments] = useState([]);
  const [selectedFields, setSelectedFields] = useState([]);
  const [selectedFarms, setSelectedFarms] = useState([]);
  const [vehicleOptions, setVehicleOptions] = useState([]);
  const [attachmentOptions, setAttachmentOptions] = useState([]);
  const [fieldOptions, setFieldOptions] = useState([]);
  const [farmOptions, setFarmOptions] = useState([]);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showTaskDetails, setShowTaskDetails] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedHarvestYears, setSelectedHarvestYears] = useState([]);
  const [selectedCrops, setSelectedCrops] = useState([]);
  const [harvestYearOptions, setHarvestYearOptions] = useState([]);
  const [cropOptions, setCropOptions] = useState([]);

  const [vehicleMenuIsOpen, setVehicleMenuIsOpen] = useState(false);
  const [attachmentMenuIsOpen, setAttachmentMenuIsOpen] = useState(false);
  const [fieldMenuIsOpen, setFieldMenuIsOpen] = useState(false);
  const [farmMenuIsOpen, setFarmMenuIsOpen] = useState(false);
  const [harvestYearMenuIsOpen, setHarvestYearMenuIsOpen] = useState(false);
  const [cropMenuIsOpen, setCropMenuIsOpen] = useState(false);

  const [showInfoEditor, setShowInfoEditor] = useState(false);

  const sortOptions = [
    { value: 'date', label: 'Datum' },
    { value: 'duration', label: 'Dauer' },
    { value: 'field', label: 'Feld' },
    { value: 'crop', label: 'Frucht' },
    { value: 'year', label: 'Erntejahr' },
    { value: 'vehicle', label: 'Fahrzeug' },
    { value: 'attachment', label: 'Anbaugerät' },
    { value: 'size', label: 'Größe' },
    { value: 'performance', label: 'Flächenleistung' }
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const url = 'http://stef.local:3000/';
        const [farmData, fieldsData, vehiclesData, attachmentsData, tasksData, cropsData, yearsData] = await Promise.all([
          fetch(url + 'plm_farms').then(res => res.json()),
          fetch(url + 'plm_fields').then(res => res.json()),
          fetch(url + 'plm_vehicles').then(res => res.json()),
          fetch(url + 'plm_attachments').then(res => res.json()),
          fetch(url + 'plm_tasks_matched').then(res => res.json()),
          fetch(url + 'plm_crops').then(res => res.json()),
          fetch(url + 'plm_years').then(res => res.json())
        ]);

        fieldsData.sort((a, b) => a.name.localeCompare(b.name));
        vehiclesData.sort((a, b) => a.name.localeCompare(b.name));
        attachmentsData.sort((a, b) => a.name.localeCompare(b.name));
        yearsData.sort((a, b) => b.year - a.year);

        setFarms(farmData);
        setFields(fieldsData);
        setVehicles(vehiclesData);
        setAttachments(attachmentsData);
        setSelectedCrops(cropsData);
        setSelectedHarvestYears(yearsData);

        const farmOptions = farmData.map(item => ({
          value: item.id,
          label: item.name
        }))
        const vehicleOptions = vehiclesData.map(item => ({
          value: item.id,
          label: item.name
        }));
        const attachmentOptions = attachmentsData.map(item => ({
          value: item.id,
          label: item.name
        }));
        const fieldOptions = fieldsData.map(item => ({
          value: item.id,
          label: item.name,
          farmId: item.farmId
        }));
        const cropOptions = cropsData
          .map(item => ({
            value: item.crop_id,
            label: item.name
          }))
          .sort((a, b) => a.label.localeCompare(b.label));
        const harvestYearOptions = yearsData.map(year => ({
          value: year.year,
          label: year.year.toString()
        }));

        setFarmOptions(farmOptions);
        setVehicleOptions(vehicleOptions);
        setAttachmentOptions(attachmentOptions);
        setFieldOptions(fieldOptions);
        setFilteredFieldOptions(fieldOptions);
        setCropOptions(cropOptions);
        setHarvestYearOptions(harvestYearOptions);

        const allVehicleIds = vehiclesData.map(vehicle => vehicle.id);
        /*
        const allVehicleIds = vehiclesData.map(vehicle => vehicle.id);
        setSelectedVehicles(allVehicleIds);
        const allAttachmentIds = attachmentsData.map(attachment => attachment.id);
        setSelectedAttachments(allAttachmentIds);
        const allFieldIds = fieldsData.map(field => field.id);
        setSelectedFields(allFieldIds);
        */

        const initialFilteredTasks = tasksData
          .filter(task => allVehicleIds.length === 0 || allVehicleIds.includes(task.vehicles_id))
          .map(task => ({
            ...task,
            field: fieldsData.find(field => field.id === task.fields_id),
            vehicle: vehiclesData.find(vehicle => vehicle.id === task.vehicles_id),
            attachment: attachmentsData.find(attachment => attachment.id === task.attachments_id),
            beginDate: adjustToTimezone(new Date(task.begin)),
            endDate: adjustToTimezone(new Date(task.end)),

            field_info: task.field_info_id ? {
              field_id: task.field_id,
              begin: task.field_info_begin,
              year: task.year,
              crop_id: task.crop_id,
              crop_name: task.crop_name
            } : null
          }))
          .sort((a, b) => new Date(b.beginDate) - new Date(a.beginDate));

        setTasks(initialFilteredTasks);
        setFilteredTasks(initialFilteredTasks);
        setSortedTasks(initialFilteredTasks);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, []);

  const adjustToTimezone = (date, timezoneOffset) => {
    const localTime = date.getTime();
    const localOffset = date.getTimezoneOffset() * 60000;
    const utcTime = localTime + localOffset;
    return new Date(utcTime + (1 * 3600000));
  };

  useEffect(() => {
    sortAndFilterTasks();
    // eslint-disable-next-line
  }, [sortOption, sortOrder, selectedFarms, selectedVehicles, selectedAttachments, selectedFields, selectedHarvestYears, selectedCrops, startDate, endDate, tasks, searchQuery]);

  const sortAndFilterTasks = () => {
    sortedTasks.sort((a, b) => {
      switch (sortOption) {
        case 'date':
          return sortOrder === 'asc' ? a.beginDate - b.beginDate : b.beginDate - a.beginDate;
        case 'duration':
          return sortOrder === 'asc' ? a.duration - b.duration : b.duration - a.duration;
        case 'field':
          return sortOrder === 'asc' ? (b.field?.name || '').localeCompare(a.field?.name || '') : (a.field?.name || '').localeCompare(b.field?.name || '');
        case 'crop':
          return sortOrder === 'asc' ? (b.crop_name || '').localeCompare(a.crop_name || '') : (a.crop_name || 'zzz').localeCompare(b.crop_name || 'zzz');
        case 'year':
          return sortOrder === 'asc' ? (a.year || 100000) - (b.year || 100000) : (b.year || 0) - (a.year || 0);
        case 'vehicle':
          return sortOrder === 'asc' ? (a.vehicle?.name || '').localeCompare(b.vehicle?.name || '') : (b.vehicle?.name || '').localeCompare(a.vehicle?.name || '');
        case 'attachment':
          return sortOrder === 'asc' ? (a.attachment?.name || '').localeCompare(b.attachment?.name || '') : (b.attachment?.name || '').localeCompare(a.attachment?.name || '');
        case 'size':
          return sortOrder === 'asc' ? a.field.size - b.field.size : b.field.size - a.field.size;
        case 'performance':
          const unknown = sortOrder === 'desc' ? -1 : Infinity;
          const aPerformance = (a.field.size != null && a.field.size !== 0) ? ((a.field.size) / (a.duration / 3600)) : unknown;
          const bPerformance = (b.field.size != null && b.field.size !== 0) ? ((b.field.size) / (b.duration / 3600)) : unknown;

          return sortOrder === 'asc' ? aPerformance - bPerformance : bPerformance - aPerformance;
        default:
          return 0;
      }
    });

    const filteredTasks = sortedTasks.filter(task =>
      (selectedFarms.length === 0 || selectedFarms.includes(task.field.farmId)) &&
      (selectedVehicles.length === 0 || selectedVehicles.includes(task.vehicles_id)) &&
      (selectedAttachments.length === 0 || selectedAttachments.includes(task.attachments_id)) &&
      (selectedFields.length === 0 || selectedFields.includes(task.fields_id)) &&
      (selectedHarvestYears.length === 0 || selectedHarvestYears.length === harvestYearOptions.length || (task.year && selectedHarvestYears.includes(task.year))) &&
      (selectedCrops.length === 0 || selectedCrops.length === cropOptions.length || (task.crop_name && selectedCrops.includes(task.crop_id))) &&
      (!startDate || task.beginDate >= startDate) &&
      (!endDate || task.beginDate <= endDate) &&
      (!searchQuery || task.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    setFilteredTasks(filteredTasks);
  };

  const handleSortOptionChange = (event) => {
    setSortOption(event.target.value);
  };

  const handleSortOrderChange = () => {
    setSortOrder(prevOrder => (prevOrder === 'asc' ? 'desc' : 'asc'));
  };

  const handleVehicleChange = (selectedOptions) => {
    const previousSelectedVehicles = selectedVehicles.map(option => option.value);

    const itemAdded = selectedOptions.length > previousSelectedVehicles.length;

    if (selectedOptions.some(option => option.value === "*")) {
      setSelectedVehicles(vehicleOptions.map(option => option.value));
    } else {
      const selectedValues = selectedOptions ? selectedOptions.map(option => option.value) : [];
      setSelectedVehicles(selectedValues);
    }

    if (itemAdded) {
      setVehicleMenuIsOpen(true);
    } else {
      setVehicleMenuIsOpen(false);
    }
  };

  const handleAttachmentChange = (selectedOptions) => {
    const previousSelectedAttachments = selectedAttachments.map(option => option.value);

    const itemAdded = selectedOptions.length > previousSelectedAttachments.length;

    if (selectedOptions.some(option => option.value === "*")) {
      setSelectedAttachments(attachmentOptions.map(option => option.value));
    } else {
      const selectedValues = selectedOptions ? selectedOptions.map(option => option.value) : [];
      setSelectedAttachments(selectedValues);
    }

    if (itemAdded) {
      setAttachmentMenuIsOpen(true);
    } else {
      setAttachmentMenuIsOpen(false);
    }
  };

  const handleFarmChange = (selectedOptions) => {
    if (!selectedOptions || selectedOptions.length === 0) {
      setSelectedFarms([]);
      setFilteredFieldOptions(fieldOptions);
      setFarmMenuIsOpen(false);
    } else {
      const selectedFarmIds = selectedOptions ? selectedOptions.map(option => option.value) : [];

      if (selectedFarmIds.length === 0 || selectedFarmIds.includes('*')) {
        setSelectedFarms(farmOptions.map(option => option.value));
        setFilteredFieldOptions(fieldOptions);
      } else {
        setSelectedFarms(selectedFarmIds);

        const filteredFields = fieldOptions.filter(field => selectedFarmIds.includes(field.farmId));
        setFilteredFieldOptions(filteredFields);
      }

      setFarmMenuIsOpen(selectedFarmIds.length > 0);
    }
  };

  const handleFieldChange = (selectedOptions) => {
    const previousSelectedFields = selectedFields.map(option => option.value);

    const itemAdded = selectedOptions.length > previousSelectedFields.length;

    if (selectedOptions.some(option => option.value === "*")) {
      setSelectedFields(fieldOptions.map(option => option.value));
    } else {
      const selectedValues = selectedOptions ? selectedOptions.map(option => option.value) : [];
      setSelectedFields(selectedValues);
    }
    if (itemAdded) {
      setFieldMenuIsOpen(true);
    } else {
      setFieldMenuIsOpen(false);
    }
  };

  const handleHarvestYearChange = (selectedOptions) => {
    const previousSelectedHarvestYears = selectedHarvestYears.map(option => option.value);

    const itemAdded = selectedHarvestYears.length > previousSelectedHarvestYears.length;

    if (selectedOptions.some(option => option.value === "*")) {
      setSelectedHarvestYears(harvestYearOptions.map(option => option.value));
    } else {
      const selectedValues = selectedOptions ? selectedOptions.map(option => option.value) : [];
      setSelectedHarvestYears(selectedValues);
    }

    setHarvestYearMenuIsOpen(itemAdded || harvestYearMenuIsOpen);
  };

  const handleCropChange = (selectedOptions) => {
    const previousSelectedCrops = selectedCrops.map(option => option.value);

    const itemAdded = selectedOptions.length > previousSelectedCrops.length;

    if (selectedOptions.some(option => option.value === "*")) {
      setSelectedCrops(cropOptions.map(option => option.value));
    } else {
      const selectedValues = selectedOptions ? selectedOptions.map(option => option.value) : [];
      setSelectedCrops(selectedValues);
    }

    setCropMenuIsOpen(itemAdded || cropMenuIsOpen);
  };

  const formatDuration = (durationInSeconds) => {
    const hours = Math.floor(durationInSeconds / 3600);
    const minutes = Math.floor((durationInSeconds % 3600) / 60);
    const seconds = durationInSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setShowTaskDetails(true);
  };

  const handleCloseDetails = () => {
    setShowTaskDetails(false);
    setSelectedTask(null);
  };

  const togglePopup = () => {
    setShowInfoEditor(!showInfoEditor);
  }

  const closePopup = () => {
    setShowInfoEditor(false);
    //fetchData();
  }

  const selectStyle = {
    control: (base, state) => ({
      ...base,
      backgroundColor: state.isFocused ? '#555' : darkMode ? '#666' : '#555',
      color: darkMode ? '#fff' : '#ddd',
      border: '1px solid',
      cursor: 'pointer',
      borderRadius: '4px',
      padding: '10px',
      width: 300,
      minHeight: 'unset',
      maxHeight: 200,
      overflowY: 'auto',
      boxShadow: state.isFocused ? '0 0 0 1px #fff' : null,
      borderColor: state.isFocused ? '#fff' : base.borderColor,
      display: 'flex',
      position: 'relative',
    }),
    singleValue: (provided) => ({
      ...provided,
      color: '#fff',
      fontWeight: 'bold',
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isFocused ? '#ddd' : darkMode ? '#666' : '#ddd',
      color: '#333',
      '&:hover': {
        backgroundColor: state.isFocused ? '#ddd' : darkMode ? '#888' : '#eee'
      }
    }),
    menu: (provided) => ({
      ...provided,
      backgroundColor: darkMode ? '#666' : '#fff',
      color: darkMode ? '#ddd' : '#333',
      border: '1px solid',
      borderColor: darkMode ? '#777' : '#ccc',
      overflowY: 'auto',
      marginTop: 0,
    }),
    menuList: (provided) => ({
      ...provided,
      padding: 0,
    }),
    placeholder: (provided) => ({
      ...provided,
      color: darkMode ? '#fff' : '#fff',
    }),
    indicatorSeparator: (provided) => ({
      ...provided,
      backgroundColor: darkMode ? '#777' : '#ccc'
    }),
    multiValue: (provided) => ({
      ...provided,
      backgroundColor: darkMode ? '#a6a6a6' : '#999',
      borderRadius: '5px',
      padding: '2px 8px',
      display: 'flex',
      alginItems: 'center'
    }),
    multiValueLabel: (provided) => ({
      ...provided,
      color: '#fff',
      backgroundColor: darkMode ? '#a6a6a6' : '#999',
      padding: '4px 8px',
      borderRadius: '4px 0 0 4px'
    }),
    multiValueRemove: (provided) => ({
      ...provided,
      color: 'red',
      borderRadius: '0 4px 4px 0',
      '&:hover': {
        backgroundColor: 'darkred',
        color: 'white',
      },
    }),
    dropdownIndicator: (provided, state) => ({
      ...provided,
      color: state.isFocused ? 'darkgray' : 'white',
      '&:hover': {
        color: 'lightgray',
      },
      padding: '10px',
      position: 'absolute',
      top: 0,
      right: '5px',
    }),
    clearIndicator: (provided, state) => ({
      ...provided,
      color: state.isFocused ? 'darkgray' : 'white',
      '&:hover': {
        color: 'lightgray',
      },
      padding: '10px',
      position: 'absolute',
      top: 0,
      right: '25px',
    }),
  };

  const uniqueFieldNames = new Set();
  const totalSize = filteredTasks.reduce((total, task) => {
    if (task.field && !uniqueFieldNames.has(task.field.name)) {
      uniqueFieldNames.add(task.field.name);
      return total + task.field.size;
    }
    return total;
  }, 0);

  const workedSize = filteredTasks.reduce((total, task) => total + task.field.size, 0);
  const totalTasks = filteredTasks.length;
  const totalDuration = filteredTasks.reduce((total, task) => total + task.duration, 0);

  return (
    <div className={`plm-tasks ${darkMode ? 'dark-mode' : ''}`}>
      <div className='top-left-corner'>
        <DarkModeToggle darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
        <button onClick={togglePopup}>Field Editor</button>
        {showInfoEditor && (
          <>
            <div className="popup-overlay" onClick={closePopup}></div>
            <FieldInfoEditor
              fields={fields}
              crops={cropOptions}
              selectStyle={selectStyle}
              fieldOptions={fieldOptions}
              onClose={closePopup}
            />
          </>
        )}
      </div>
      <div style={{ marginTop: '50px' }}>
        <h2 className="plm-title">Aufträge</h2>
      </div>

      <div className="search-container">
        <div className="search-input-container">
          <input
            type="text"
            placeholder="Suchen"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`search-input ${darkMode ? 'dark-mode-input' : ''}`}
          />
          {searchQuery && (
            <button className="clear-button" onClick={handleClearSearch}>
              X
            </button>
          )}
        </div>
        <div className="edit-margin">
          <SaveDropdown darkMode={darkMode} filteredTasks={filteredTasks} />
        </div>
      </div>

      <div className='button-container'>
        <div>
          <div className='edit-margin'>
            <div>
              Von
              <DatePicker
                selected={startDate}
                onChange={date => setStartDate(date)}
                selectsStart
                startDate={startDate}
                endDate={endDate}
                placeholderText="Startdatum"
                dateFormat="dd.MM.yyyy"
                isClearable
                onFocus={(e) => e.target.readOnly = true}
                className="date-picker"
                calendarClassName='react-datepicker-dark'
              />
            </div>
            <br />
            <div>
              Bis
              <DatePicker
                selected={endDate}
                onChange={date => setEndDate(date)}
                selectsEnd
                startDate={startDate}
                endDate={endDate}
                minDate={startDate}
                placeholderText="Enddatum"
                dateFormat="dd.MM.yyyy"
                isClearable
                onFocus={(e) => e.target.readOnly = true}
                className="date-picker"
                calendarClassName='react-datepicker-dark'
              />
            </div>
          </div>
        </div>

        <div className="sort-container">
          <div>
            Reihenfolge:
          </div>
          <div className="sort-select">
            <select value={sortOption} onChange={handleSortOptionChange}>
              {sortOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div className="sort-order">
            <button onClick={handleSortOrderChange}>
              {sortOrder === 'asc' ? 'Aufsteigend' : 'Absteigend'}
            </button>
          </div>
        </div>

        <div class="dropdownHarvestYears">
          <Select
            value={isSelectAllSelected(selectedHarvestYears) ? [SelectAllOption, ...harvestYearOptions] : harvestYearOptions.filter(option => selectedHarvestYears.includes(option.value))}
            isMulti
            name="harvestYears"
            options={[SelectAllOption, ...harvestYearOptions]}
            className="basic-multi-select"
            classNamePrefix="select"
            onChange={handleHarvestYearChange}
            styles={selectStyle}
            placeholder="Alle Erntejahre"
            components={{ Option: SelectAllCheckbox }}
            isSearchable={false}
            menuIsOpen={harvestYearMenuIsOpen}
            onMenuClose={() => setHarvestYearMenuIsOpen(false)}
            onMenuOpen={() => setHarvestYearMenuIsOpen(true)}
          />
        </div>
        <div class="dropdownCrops">
          <Select
            value={isSelectAllSelected(selectedCrops) ? [SelectAllOption, ...cropOptions] : cropOptions.filter(option => selectedCrops.includes(option.value))}
            isMulti
            name="crops"
            options={[SelectAllOption, ...cropOptions]}
            className="basic-multi-select"
            classNamePrefix="select"
            onChange={handleCropChange}
            styles={selectStyle}
            placeholder="Alle Früchte"
            components={{ Option: SelectAllCheckbox }}
            isSearchable={false}
            menuIsOpen={cropMenuIsOpen}
            onMenuClose={() => setCropMenuIsOpen(false)}
            onMenuOpen={() => setCropMenuIsOpen(true)}
          />
        </div>
        <div>
          <p>Gesamtanzahl Aufträge: {totalTasks}</p>
          <p>Bewirtschaftete Fläche:  {totalSize.toFixed(2)} ha ({((totalDuration / 3600) / totalSize).toFixed(2)} h/ha)</p>
          <p>Bearbeitete Fläche: {workedSize.toFixed(2)} ha ({(workedSize / (totalDuration / 3600)).toFixed(2)} ha/h)</p>
          <p>Gesamtdauer: {formatDuration(totalDuration)}</p>
        </div>
      </div>
      <div className="button-container">
        <div className="">
          <Select
            value={isSelectAllSelected(selectedVehicles) ? [SelectAllOption, ...vehicleOptions] : vehicleOptions.filter(option => selectedVehicles.includes(option.value))}
            isMulti
            name="vehicles"
            options={[SelectAllOption, ...vehicleOptions]}
            className="basic-multi-select"
            classNamePrefix="select"
            onChange={handleVehicleChange}
            styles={selectStyle}
            placeholder="Alle Fahrzeuge"
            components={{ Option: SelectAllCheckbox }}
            isSearchable={false}
            menuIsOpen={vehicleMenuIsOpen}
            onMenuClose={() => setVehicleMenuIsOpen(false)}
            onMenuOpen={() => setVehicleMenuIsOpen(true)}
          />
        </div>
        <div style={{ position: 'relative' }}>
          <Select
            value={isSelectAllSelected(selectedAttachments) ? [SelectAllOption, ...attachmentOptions] : attachmentOptions.filter(option => selectedAttachments.includes(option.value))}
            isMulti
            name="attachments"
            options={[SelectAllOption, ...attachmentOptions]}
            className="basic-multi-select"
            classNamePrefix="select"
            onChange={handleAttachmentChange}
            styles={selectStyle}
            placeholder="Alle Anbaugeräte"
            components={{ Option: SelectAllCheckbox, }}
            isSearchable={false}
            menuIsOpen={attachmentMenuIsOpen}
            onMenuClose={() => setAttachmentMenuIsOpen(false)}
            onMenuOpen={() => setAttachmentMenuIsOpen(true)}
          />
        </div>
        <div>
          <Select
            value={isSelectAllSelected(selectedFarms) ? [SelectAllOption, ...farmOptions] : farmOptions.filter(option => selectedFarms.includes(option.value))}
            isMulti
            name="farms"
            options={[SelectAllOption, ...farmOptions]}
            className="basic-multi-select"
            classNamePrefix="select"
            onChange={handleFarmChange}
            styles={selectStyle}
            placeholder="Alle Betriebe"
            components={{ Option: SelectAllCheckbox }}
            isSearchable={false}
            menuIsOpen={farmMenuIsOpen}
            onMenuClose={() => setFarmMenuIsOpen(false)}
            onMenuOpen={() => setFarmMenuIsOpen(true)}
          />
        </div>
        <div>
          <Select
            value={isSelectAllSelected(selectedFields) ? [SelectAllOption, ...fieldOptions] : fieldOptions.filter(option => selectedFields.includes(option.value))}
            isMulti
            name="fields"
            options={[SelectAllOption, ...filteredFieldOptions]}
            className="basic-multi-select"
            classNamePrefix="select"
            onChange={handleFieldChange}
            styles={selectStyle}
            placeholder="Alle Felder"
            components={{ Option: SelectAllCheckbox }}
            isSearchable={false}
            menuIsOpen={fieldMenuIsOpen}
            onMenuClose={() => setFieldMenuIsOpen(false)}
            onMenuOpen={() => setFieldMenuIsOpen(true)}
          />
        </div>
      </div>
      <table className='plm-table'>
        <thead>
          <tr>
            <th>ID</th>
            <th>Betrieb</th>
            <th>Erntejahr</th>
            <th>Frucht</th>
            <th>Feld</th>
            <th>Größe</th>
            <th>Fahrzeug</th>
            <th>Gerät</th>
            <th>Beschreibung</th>
            <th>Datum</th>
            <th>Dauer</th>
            { /*<th>Ende</th>*/}
            <th>Flächenleistung</th>
          </tr>
        </thead>
        <tbody>
          {filteredTasks.map(task => (
            <tr key={task.id}>
              <td onClick={() => handleTaskClick(task)} style={{ cursor: 'pointer' }}>{task.id}</td>
              <td>{task.field.farmId ? task.field.farmName : '-'}</td>
              <td>{task.year ? task.year : '-'}</td>
              <td>{task.field_info ? task.field_info.crop_name : '-'}</td>
              <td>{task.field ? task.field.name : 'Error'}</td>
              <td>{task.field.size != null ? `${task.field.size} ha` : '-'}</td>
              <td>{task.vehicle ? task.vehicle.name : 'Error'}</td>
              <td>{task.attachment ? task.attachment.name : 'Error'}</td>
              <td>{task.description}</td>
              <td>{task.beginDate.toLocaleString('de-DE', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
              })}</td>
              <td>{formatDuration(task.duration)}</td>
              {/*<td>{task.endDate.toLocaleString('de-DE', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
              })}</td>*/}
              <td>{(task.field.size != null && task.field.size !== 0) ? ((task.field.size) / (task.duration / 3600)).toFixed(2) + " ha/h" : "Unbekannt"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {showTaskDetails && selectedTask && (
        <div className="modal">
          <div className="modal-content">
            <TaskDetails task={selectedTask} onClose={handleCloseDetails} />
          </div>
        </div>
      )}
    </div>
  );
};

export default PlmTask;