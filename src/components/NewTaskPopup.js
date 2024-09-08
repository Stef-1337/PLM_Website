import React, { useState } from 'react';
import './NewTaskPopup.css';

const NewTaskPopup = ({ onClose, onAddTask, fields, vehicles, attachments }) => {

  const getCurrentDateTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const [taskData, setTaskData] = useState({
    field: '',
    vehicle: '',
    attachment: '',
    description: '',
    duration: '',
    begin: getCurrentDateTime(),
    end: getCurrentDateTime()
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setTaskData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const formatDateForMySQL = (date) => {
      if (!date) return null;
      const d = new Date(date);
      //TODO submit data
      return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
    };

    const formattedBegin = formatDateForMySQL(taskData.begin);
    const formattedEnd = formatDateForMySQL(taskData.end);

    try {
      const response = await fetch(`/plm_task_create?fields_id=${taskData.field}&vehicles_id=${taskData.vehicle}&attachments_id=${taskData.attachment}&description=${encodeURIComponent(taskData.description)}&duration=${taskData.duration}&begin=${formattedBegin}&end=${formattedEnd}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        console.log('Task created successfully');
        await onAddTask();
        onClose();
      } else {
        console.error('Error creating task');
      }
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  return (
    <div className="popup-container">
      <h3>Neuen Auftrag hinzufügen:</h3>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <div>
            <label htmlFor="field">Feld:</label>
            <select id="field" name="field" value={taskData.field} onChange={handleChange}>
              <option value="">Bitte wählen</option>
              {fields.map(field => (
                <option key={field.id} value={field.id}>{field.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="vehicle">Fahrzeug:</label>
            <select id="vehicle" name="vehicle" value={taskData.vehicle} onChange={handleChange}>
              <option value="">Bitte wählen</option>
              {vehicles.map(vehicle => (
                <option key={vehicle.id} value={vehicle.id}>{vehicle.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="attachment">Gerät:</label>
            <select id="attachment" name="attachment" value={taskData.attachment} onChange={handleChange}>
              <option value="">Bitte wählen</option>
              {attachments.map(attachment => (
                <option key={attachment.id} value={attachment.id}>{attachment.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="description">Beschreibung:</label>
            <input type="text" id="description" name="description" value={taskData.description} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label htmlFor="duration">Dauer:</label>
            <input type="text" id="duration" name="duration" value={taskData.duration} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label htmlFor="begin">Datum:</label>
            <input type="datetime-local" id="begin" name="begin" value={taskData.begin} onChange={handleChange} />
          </div>
        </div>
        <div className="form-actions">
          <button type="submit">Auftrag erstellen</button>
          <button type="button" onClick={onClose}>Abbruch</button>
        </div>
      </form>
    </div>
  );

};

export default NewTaskPopup;