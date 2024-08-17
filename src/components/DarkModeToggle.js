import React from 'react';
//import './DarkModeToggle.css';

const DarkModeToggle = ({ darkMode, toggleDarkMode }) => {
  return (
    <button className="DarkModeToggle" onClick={toggleDarkMode}>
      {darkMode ? 'Light Mode' : 'Dark Mode'}
    </button>
  );
};

export default DarkModeToggle;