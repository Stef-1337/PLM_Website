import React, { useEffect, useRef } from 'react';

const TaskDetails = ({ task, onClose }) => {
  const taskDetailsRef = useRef(null);

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

  return (
    <div className="task-details" ref={taskDetailsRef}>
      <h3>Task Details</h3>
      <p><strong>ID:</strong> {task.id}</p>
      <p><strong>Field:</strong> {task.field ? task.field.name : 'Error'}</p>
      <button onClick={onClose}>Close</button>
    </div>
  );
};

export default TaskDetails;