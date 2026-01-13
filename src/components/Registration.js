import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/registration.css";

export default function Registration() {
  const navigate = useNavigate();
  
  const [form, setForm] = useState({ 
    username: '', 
    email: '', 
    password: '' 
  });
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const goToLogin = () => {
    navigate('/login');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('http://localhost:5000/api/registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      
      const data = await response.json();
      
      if (data.success) {
        localStorage.setItem('user', JSON.stringify(data.user));
        navigate('/main');
      } else {
        setError(data.error || 'Ошибка регистрации');
      }
    } catch (err) {
      setError('Ошибка соединения с сервером');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="registration-container">
      <div className="registration-card">
        <div className="registration-header">
          <h1 className="registration-logo">MovieDiary</h1>
          <p className="registration-subtitle">Создайте ваш кинодневник</p>
        </div>

        {error && (
          <div className="registration-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="registration-form">
          <div className="input-group">
            <input
              type="text"
              name="username"
              placeholder="Логин"
              value={form.username}
              onChange={handleChange}
              className="registration-input"
              required
            />
          </div>

          <div className="input-group">
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={form.email}
              onChange={handleChange}
              className="registration-input"
              required
            />
          </div>

          <div className="input-group">
            <input
              type="password"
              name="password"
              placeholder="Пароль"
              value={form.password}
              onChange={handleChange}
              className="registration-input"
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="registration-button"
          >
            {loading ? 'Регистрация...' : 'Зарегистрироваться'}
          </button>

          <button 
            type="button" 
            onClick={goToLogin}
            className="login-button-secondary"
          >
            Уже есть аккаунт? Войти
          </button>
        </form>

        <div className="registration-footer">
          <p className="registration-footer-text">
            Нажимая "Зарегистрироваться", вы соглашаетесь с нашими условиями
          </p>
        </div>
      </div>
    </div>
  );
}