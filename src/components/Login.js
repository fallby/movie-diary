import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/login.css";

export default function Login() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: '',
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      
      const data = await response.json();
      
      if (data.success) {
        if (!data.user || !data.user.id) {
          setError('Ошибка сервера: не удалось получить данные пользователя');
          return;
        }
        
        localStorage.setItem('user', JSON.stringify(data.user));
        navigate('/main');
      } else {
        setError(data.error || 'Неверный логин или пароль');
      }
    } catch (err) {
      setError('Ошибка соединения с сервером');
    } finally {
      setLoading(false);
    }
  };

  const goToRegistration = () => {
    navigate('/registration');
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1 className="login-logo">MovieDiary</h1>
          <p className="login-subtitle">Войдите в ваш кинодневник</p>
        </div>

        {error && (
          <div className="login-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <input
              type="text"
              name="username"
              placeholder="Логин"
              value={form.username}
              onChange={handleChange}
              className="login-input"
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
              className="login-input"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="login-button"
          >
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>

        <div className="login-footer">
          <p className="login-footer-text">
            Еще нет аккаунта?{' '}
            <button
              onClick={goToRegistration}
              className="login-link"
              type="button"
            >
              Зарегистрироваться
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}