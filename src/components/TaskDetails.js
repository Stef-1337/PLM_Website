import React, { useState, useEffect, useRef } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const TaskDetails = ({ task, onClose, onRefreshTasks, FieldOptions, VehicleOptions, AttachmentOptions }) => {
  const taskDetailsRef = useRef(null);
  const [taskData, setTaskData] = useState({
    id: task.id,
    field: task.field,
    vehicle: task.vehicle,
    attachment: task.attachment,
    description: task.description,
    duration: task.duration,
    begin: task.begin,
    beginDate: task.beginDate,
    end: task.end,
  });

  const durationInSeconds = taskData.duration || 0;
  const hours = Math.floor(durationInSeconds / 3600);
  const minutes = Math.floor((durationInSeconds % 3600) / 60);
  const [selectedDuration, setSelectedDuration] = React.useState(new Date(0, 0, 0, hours, minutes));

  const [selectedDate, setSelectedDate] = React.useState(new Date(taskData.beginDate));

  const handleFieldChange = (e) => {
    const selectedFieldId = e.target.value;
    handleChange({ target: { name: 'field', value: { id: selectedFieldId } } });
  };

  const handleVehicleChange = (e) => {
    console.log(AttachmentOptions);
    const selectedVehicleId = e.target.value;
    handleChange({ target: { name: 'vehicle', value: { id: selectedVehicleId } } });
  }

  const handleAttachmentChange = (e) => {
    const selectedAttachmentId = e.target.value;
    handleChange({ target: { name: 'attachment', value: { id: selectedAttachmentId } } });
  }

  const handleDurationChange = (time) => {
    setSelectedDuration(time);
    const newHours = time.getHours();
    const newMinutes = time.getMinutes();
    const totalSeconds = newHours * 3600 + newMinutes * 60; // Convert hours and minutes to total seconds
    handleChange({ target: { name: 'duration', value: totalSeconds } });
  };

  const handleDateChange = (date) => {
    setSelectedDate(date);
    handleChange({ target: { name: 'begin', value: date } });
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (taskDetailsRef.current && !taskDetailsRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const handleChange = (e) => {
    setTaskData({ ...taskData, [e.target.name]: e.target.value });
  };

  const formatDateForMySQL = (date) => {
    const d = new Date(date);
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const formattedBegin = formatDateForMySQL(selectedDate);
      const formattedEnd = formatDateForMySQL(taskData.end);

      const response = await fetch(`http://stef.local:3000/plm_task_update?task_id=${taskData.id}&fields_id=${taskData.field.id}&vehicles_id=${taskData.vehicle.id}&attachments_id=${taskData.attachment.id}&description=${taskData.description}&duration=${taskData.duration}&begin=${formattedBegin}&end=${formattedEnd}`);

      if (response.ok) {
        console.log('Task updated successfully');
        await onRefreshTasks();
        onClose();
      } else {
        console.error('Error updating task');
      }
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  return (
    <div className="task-details" ref={taskDetailsRef}>
      <h3>Auftrag #{taskData.id}</h3>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Feld:</label>
          <select name="field" value={taskData.field.id} onChange={handleFieldChange}>
            {FieldOptions.map((field) => (
              <option key={field.value} value={field.value}>
                {field.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Fahrzeug:</label>
          <select name="vehicle" value={taskData.vehicle.id} onChange={handleVehicleChange}>
            {VehicleOptions.map((vehicle) => (
              <option key={vehicle.value} value={vehicle.value}>
                {vehicle.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Gerät:</label>
          <select name="attachment" value={taskData.attachment.id} onChange={handleAttachmentChange}>
            {AttachmentOptions.map((attachment) => (
              <option key={attachment.value} value={attachment.value}>
                {attachment.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Beschreibung:</label>
          <input type="text" name="description" value={taskData.description} onChange={handleChange} />
        </div>
        <div>
          <label>Dauer:</label>
          <DatePicker
            selected={selectedDuration}
            onChange={handleDurationChange}
            showTimeSelect
            showTimeSelectOnly
            timeIntervals={15}
            timeCaption="Dauer"
            dateFormat="HH:mm"
            timeFormat="HH:mm"
          />
        </div>
        <div>
          <label>Datum:</label>
          <DatePicker
            selected={selectedDate}
            onChange={handleDateChange}
            showTimeSelect
            timeFormat="HH:mm"
            timeIntervals={15}
            dateFormat="dd.MM.yyyy HH:mm"
            timeCaption="Time"
          />
        </div>
        <button type="submit">Speichern</button>
        <button type="button" onClick={onClose}>Zurück</button>
      </form>
    </div>
  );
};

export default TaskDetails;