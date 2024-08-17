import React, { useState } from 'react';
import './App.css';
import PlmTask from './components/PlmTask';

const App = () => {
  const [darkMode, setDarkMode] = useState(false);

  const toggleDarkMode = () => {
    setDarkMode(prevMode => !prevMode);
  };

  return (
    <div className={`App ${darkMode ? 'dark-mode' : ''}`}>
      <PlmTask darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
      <footer className={`App-footer ${darkMode ? 'dark-footer' : ''}`}>
        <p>&copy; 2024 SF</p>
      </footer>
    </div>
  );
};

export default App;