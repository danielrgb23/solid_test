import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth_context';
import '../styles/dashboard.css';

const Dashboard: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleButton1Click = () => {
    console.log('Botão 1 clicado');
    // Adicione sua lógica aqui
  };

  const handleButton2Click = () => {
    console.log('Botão 2 clicado');
    // Adicione sua lógica aqui
  };

  const handleButton3Click = () => {
    console.log('Botão 3 clicado');
    // Adicione sua lógica aqui
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-content">
        <h1>Dashboard</h1>
        <div className="buttons-container">
          <button onClick={handleButton1Click} className="dashboard-button">
            Botão 1
          </button>
          <button onClick={handleButton2Click} className="dashboard-button">
            Botão 2
          </button>
          <button onClick={handleButton3Click} className="dashboard-button">
            Botão 3
          </button>
        </div>
        <button onClick={handleLogout} className="logout-button">
          Logout
        </button>
      </div>
    </div>
  );
};

export default Dashboard;