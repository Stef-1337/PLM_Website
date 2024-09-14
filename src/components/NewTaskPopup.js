import React, { useState } from 'react';
import './NewTaskPopup.css';

const NewTaskPopup = ({ onClose, onAddTask, fields, vehicles, attachments }) => {

  const [successMessage, setSuccessMessage] = useState('');

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
    duration: 0,
    begin: getCurrentDateTime(),
    end: getCurrentDateTime()
  });

  const durationOptions = [
    '00:00', '00:15', '00:30', '00:45',
    '01:00', '01:15', '01:30', '01:45',
    '02:00', '02:15', '02:30', '02:45',
    '03:00', '03:15', '03:30', '03:45',
    '04:00', '04:15', '04:30', '04:45',
    '05:00', '05:15', '05:30', '05:45',
    '06:00', '06:15', '06:30', '06:45',
    '07:00', '07:15', '07:30', '07:45',
    '08:00', '08:15', '08:30', '08:45',
    '09:00', '09:15', '09:30', '09:45',
    '10:00', '10:15', '10:30', '10:45',
    '11:00', '11:15', '11:30', '11:45',
    '12:00', '12:15', '12:30', '12:45',
    '13:00', '13:15', '13:30', '13:45',
    '14:00', '14:15', '14:30', '14:45',
    '15:00', '15:15', '15:30', '15:45',
    '16:00', '16:15', '16:30', '16:45',
    '17:00', '17:15', '17:30', '17:45',
    '18:00', '18:15', '18:30', '18:45',
    '19:00', '19:15', '19:30', '19:45',
    '20:00', '20:15', '20:30', '20:45',
    '21:00', '21:15', '21:30', '21:45',
    '22:00', '22:15', '22:30', '22:45',
    '23:00', '23:15', '23:30', '23:45'
  ];

  const durationToSeconds = (duration) => {
    const [hours, minutes] = duration.split(':').map(Number);
    return (hours * 3600) + (minutes * 60);
  };

  const secondsToDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setTaskData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  const handleDurationChange = (e) => {
    const { value } = e.target;
    setTaskData(prevData => ({
      ...prevData,
      duration: durationToSeconds(value)
    }));
  };

  const handleCloseMessage = () => {
    setSuccessMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const formatDateForMySQL = (date) => {
      if (!date) return null;
      const d = new Date(date);
      return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
    };

    const formattedBegin = formatDateForMySQL(taskData.begin);
    const formattedEnd = formatDateForMySQL(taskData.end);

    try {
      const response = await fetch('http://stef.local:3000/plm_task_insert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields_id: taskData.field,
          vehicles_id: taskData.vehicle,
          attachments_id: taskData.attachment,
          description: taskData.description,
          duration: taskData.duration,
          begin: formattedBegin,
          end: formattedEnd,
        }),
      });

      if (response.ok) {
        console.log('Task created successfully');
        setSuccessMessage(`Der Auftrag "${taskData.description}" wurde für "${fields.find(f => Number(f.id) === Number(taskData.field))?.name}" hinzugefügt.`);
        await onAddTask();
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
            <select id="duration" name="duration" value={secondsToDuration(taskData.duration)} onChange={handleDurationChange}>
              {durationOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
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
        {successMessage && (
          <div className="success-message">
            {successMessage}
            <button className="close-button" onClick={handleCloseMessage}>X</button>
          </div>
        )}
      </form>
    </div>
  );
};

export default NewTaskPopup;