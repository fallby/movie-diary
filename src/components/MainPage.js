import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/mainPage.css';

export default function MainPage() {
  const [user, setUser] = useState(null);
  const [movies, setMovies] = useState([]);
  const [userMovies, setUserMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('planned');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState(null);
  const [reviewText, setReviewText] = useState('');
  const [isSavingReview, setIsSavingReview] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
      } catch (error) {
        navigate('/login');
      }
    } else {
      navigate('/login');
    }
  }, [navigate]);

  useEffect(() => {
    if (user && user.id) {
      loadMovies();
      loadUserMovies();
    }
  }, [user]);

  const loadMovies = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/movies');
      const data = await response.json();
      setMovies(Array.isArray(data) ? data : []);
    } catch (error) {
      setMovies([]);
    }
  };

  const loadUserMovies = async () => {
    if (!user || !user.id) return;

    try {
      const response = await fetch(`http://localhost:5000/api/user/${user.id}/movies`);
      const data = await response.json();
      setUserMovies(Array.isArray(data) ? data : []);
      setLoading(false);
    } catch (error) {
      setUserMovies([]);
      setLoading(false);
    }
  };

  const addMovieToDiary = async (movieId, status) => {
    if (!user || !user.id) return;

    try {
      const response = await fetch('http://localhost:5000/api/user/movies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          movieId,
          status
        })
      });

      const data = await response.json();

      if (data.success) {
        await loadUserMovies();
        setShowSearch(false);
        setSearchQuery('');
      }
    } catch (error) {}
  };

  const updateMovieStatus = async (userMovieId, newStatus) => {
    if (!userMovieId || userMovieId === 'undefined') return;

    const numericId = Number(userMovieId);
    if (isNaN(numericId)) return;

    try {
      const response = await fetch(`http://localhost:5000/api/user/movies/${numericId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      const data = await response.json();

      if (data.success) {
        setTimeout(() => loadUserMovies(), 300);
      }
    } catch (error) {}
  };

  const rateMovie = async (userMovieId, rating) => {
    try {
      const response = await fetch(`http://localhost:5000/api/user/movies/${userMovieId}/rate`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating })
      });

      const data = await response.json();
      if (data.success) {
        loadUserMovies();
      }
    } catch (error) { }
  };

  const startEditReview = (userMovie) => {
    setEditingReviewId(userMovie.id);
    setReviewText(userMovie.review || '');
  };

  const cancelEditReview = () => {
    setEditingReviewId(null);
    setReviewText('');
    setIsSavingReview(false);
  };

  const saveReview = async () => {
    if (!editingReviewId) return;
    setIsSavingReview(true);

    try {
      const response = await fetch(`http://localhost:5000/api/user/movies/${editingReviewId}/review`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ review: reviewText.trim() })
      });

      const data = await response.json();

      if (data.success) {
        setUserMovies(prev => prev.map(movie =>
          movie.id === editingReviewId ? { ...movie, review: reviewText.trim() } : movie
        ));
        cancelEditReview();
      }
    } catch (error) {
    } finally {
      setIsSavingReview(false);
    }
  };

  const deleteReview = async (userMovieId) => {
    if (!window.confirm('Удалить отзыв?')) return;

    try {
      const response = await fetch(`http://localhost:5000/api/user/movies/${userMovieId}/review`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ review: '' })
      });

      const data = await response.json();

      if (data.success) {
        setUserMovies(prev => prev.map(movie =>
          movie.id === userMovieId ? { ...movie, review: '' } : movie
        ));
      }
    } catch (error) {}
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (!user) {
    return <div className="loading-container">Загрузка пользователя...</div>;
  }

  if (loading) {
    return (
      <div className="loading-container">
        <h2 className="loading-title">Загрузка данных...</h2>
        <button onClick={() => { loadMovies(); loadUserMovies(); }} className="refresh-button">
          Повторить загрузку
        </button>
      </div>
    );
  }

  const enhancedUserMovies = userMovies.map(userMovie => {
    const movieInfo = movies.find(m =>
      m.movie_id === userMovie.movie_id || m.id === userMovie.movie_id
    );

    let status = 'planned';
    if (userMovie.status_id === 2) status = 'watching';
    if (userMovie.status_id === 3) status = 'watched';

    return {
      ...userMovie,
      status: status,
      title: movieInfo?.title || `Фильм #${userMovie.movie_id}`,
      year: movieInfo?.year,
      genre: movieInfo?.genre,
      director: movieInfo?.director,
      description: movieInfo?.description
    };
  });

  const filteredUserMovies = enhancedUserMovies.filter(m => m.status === activeTab);

  const stats = {
    total: enhancedUserMovies.length,
    planned: enhancedUserMovies.filter(m => m.status === 'planned').length,
    watching: enhancedUserMovies.filter(m => m.status === 'watching').length,
    watched: enhancedUserMovies.filter(m => m.status === 'watched').length,
  };

  const availableMovies = movies.filter(movie => {
    const movieId = movie.id || movie.movie_id;
    return !enhancedUserMovies.some(um => um.movie_id === movieId);
  });

  const filteredMovies = availableMovies.filter(movie =>
    movie.title && movie.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="main-container">
      <div className="header">
        <h1 className="logo">MovieDiary</h1>
        <button onClick={handleLogout} className="logout-button">
          Выйти
        </button>
      </div>
      <div className="content-wrapper">
        <div className="stats-card">
          <h2 className="stats-title">Моя статистика</h2>
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-value stat-total">{stats.total}</div>
              <div className="stat-label">Всего фильмов</div>
            </div>
            <div className="stat-item">
              <div className="stat-value stat-planned">{stats.planned}</div>
              <div className="stat-label">Хочу посмотреть</div>
            </div>
            <div className="stat-item">
              <div className="stat-value stat-watching">{stats.watching}</div>
              <div className="stat-label">Смотрю сейчас</div>
            </div>
            <div className="stat-item">
              <div className="stat-value stat-watched">{stats.watched}</div>
              <div className="stat-label">Просмотрено</div>
            </div>
          </div>
        </div>
      </div>

      <div className="search-section">
        <button
          onClick={() => setShowSearch(!showSearch)}
          className="toggle-search-button"
        >
          {showSearch ? 'Скрыть поиск' : 'Добавить новый фильм'}
        </button>

        {showSearch && (
          <div className="search-card">
            <input
              type="text"
              placeholder="Начните вводить название фильма..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />

            {filteredMovies.length === 0 ? (
              <p className="no-movies-text">
                {availableMovies.length === 0
                  ? 'Вы добавили все доступные фильмы в свой дневник!'
                  : 'Фильмы не найдены'}
              </p>
            ) : (
              <div className="movies-grid">
                {filteredMovies.map(movie => {
                  const movieId = movie.id || movie.movie_id;
                  return (
                    <div key={movieId} className="movie-card">
                      <div className="movie-info">
                        <h3 className="movie-title">
                          {movie.title}
                          {movie.year && <span className="movie-year"> ({movie.year})</span>}
                        </h3>
                        <p className="movie-meta">
                          {movie.genre && <span className="movie-genre">{movie.genre}</span>}
                          {movie.director && <span className="movie-director"> • {movie.director}</span>}
                        </p>
                        {movie.description && (
                          <p className="movie-description">{movie.description}</p>
                        )}
                      </div>
                      <button
                        onClick={() => addMovieToDiary(movieId, 'planned')}
                        className="add-movie-button"
                      >
                        Добавить в дневник
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="diary-card">
        <div className="diary-header">
          <h2 className="diary-title">Мой кинодневник</h2>
          <div className="tabs-indicator">
            <span className="active-count">{filteredUserMovies.length}</span> фильмов в категории
          </div>
        </div>

        <div className="tabs-container">
          <button
            onClick={() => setActiveTab('planned')}
            className={`tab-button tab-planned ${activeTab === 'planned' ? 'active' : ''}`}
          >
            <span className="tab-text">Хочу посмотреть</span>
          </button>
          <button
            onClick={() => setActiveTab('watching')}
            className={`tab-button tab-watching ${activeTab === 'watching' ? 'active' : ''}`}
          >
            <span className="tab-text">Смотрю сейчас</span>
          </button>
          <button
            onClick={() => setActiveTab('watched')}
            className={`tab-button tab-watched ${activeTab === 'watched' ? 'active' : ''}`}
          >
            <span className="tab-text">Просмотрено</span>
          </button>
        </div>

        <div className="movies-list">
          {filteredUserMovies.length === 0 ? (
            <div className="empty-state">
              <h3 className="empty-title">
                {activeTab === 'planned' ? 'Список "Хочу посмотреть" пуст' :
                  activeTab === 'watching' ? 'Вы ничего не смотрите сейчас' :
                    'Вы еще ничего не посмотрели'}
              </h3>
              <p className="empty-text">
                {activeTab === 'planned' ? 'Найдите интересные фильмы через поиск и добавьте их сюда!' :
                  activeTab === 'watching' ? 'Начните смотреть фильмы из списка "Хочу посмотреть"' :
                    'Отмечайте просмотренные фильмы для отслеживания прогресса'}
              </p>
              {activeTab === 'planned' && (
                <button
                  onClick={() => setShowSearch(true)}
                  className="empty-action-button"
                >
                  Найти фильмы
                </button>
              )}
            </div>
          ) : (
            <div className="user-movies-grid">
              {filteredUserMovies.map(userMovie => (
                <div key={userMovie.id} className={`user-movie-card ${userMovie.status}`}>
                  <div className="user-movie-content">
                    <div className="user-movie-header">
                      <div>
                        <h3 className="user-movie-title">
                          {userMovie.title}
                          {userMovie.year && <span className="user-movie-year"> ({userMovie.year})</span>}
                        </h3>
                        <div className="user-movie-meta">
                          {userMovie.genre && <span className="user-movie-genre">{userMovie.genre}</span>}
                          {userMovie.director && <span className="user-movie-director"> • Реж: {userMovie.director}</span>}
                        </div>
                      </div>

                      <div className="status-badge">
                        <span className={`status-dot status-${userMovie.status}`}></span>
                        <span className="status-text">
                          {userMovie.status === 'planned' ? 'Хочу посмотреть' :
                            userMovie.status === 'watching' ? 'Смотрю сейчас' : 'Просмотрено'}
                        </span>
                      </div>
                    </div>

                    {userMovie.description && (
                      <p className="user-movie-description">{userMovie.description}</p>
                    )}

                    <div className="user-movie-actions">
                      <div className="status-buttons">
                        <button
                          onClick={() => updateMovieStatus(userMovie.id, 'planned')}
                          className={`status-button plan-btn ${userMovie.status === 'planned' ? 'active' : ''}`}
                          title="Хочу посмотреть"
                        >
                          Запланировать
                        </button>
                        <button
                          onClick={() => updateMovieStatus(userMovie.id, 'watching')}
                          className={`status-button watch-btn ${userMovie.status === 'watching' ? 'active' : ''}`}
                          title="Смотрю сейчас"
                        >
                          Смотрю
                        </button>
                        <button
                          onClick={() => updateMovieStatus(userMovie.id, 'watched')}
                          className={`status-button done-btn ${userMovie.status === 'watched' ? 'active' : ''}`}
                          title="Просмотрено"
                        >
                          Просмотрено
                        </button>
                      </div>

                      {userMovie.status === 'watched' && (
                        <div className="rating-section">
                          <div className="current-rating">
                            <span className="rating-label">Ваша оценка:</span>
                            <div className="stars-display">
                              {[1, 2, 3, 4, 5].map(star => (
                                <span
                                  key={star}
                                  className={`star ${userMovie.rating && userMovie.rating >= star ? 'filled' : 'empty'}`}
                                >
                                  ★
                                </span>
                              ))}
                              {!userMovie.rating && <span className="no-rating">Нет оценки</span>}
                            </div>
                          </div>
                          <div className="rating-buttons">
                            <span className="rating-label">Поставить оценку:</span>
                            <div className="stars-selector">
                              {[1, 2, 3, 4, 5].map(star => (
                                <button
                                  key={star}
                                  onClick={() => rateMovie(userMovie.id, star)}
                                  className={`star-button ${userMovie.rating === star ? 'active' : ''}`}
                                >
                                  {star}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {userMovie.status === 'watched' && (
                        <div className="review-section">
                          <div className="review-header">
                            <h4 className="review-title">Ваши впечатления о фильме</h4>
                            {editingReviewId !== userMovie.id && userMovie.review && (
                              <div className="review-actions">
                                <button
                                  onClick={() => startEditReview(userMovie)}
                                  className="review-action-btn edit-btn"
                                  title="Редактировать отзыв"
                                >
                                  Редактировать
                                </button>
                                <button
                                  onClick={() => deleteReview(userMovie.id)}
                                  className="review-action-btn delete-btn"
                                  title="Удалить отзыв"
                                >
                                  Удалить
                                </button>
                              </div>
                            )}
                          </div>

                          {editingReviewId === userMovie.id ? (
                            <div className="review-edit-mode">
                              <textarea
                                className="review-textarea"
                                value={reviewText}
                                onChange={(e) => setReviewText(e.target.value)}
                                placeholder="Напишите свои впечатления о фильме..."
                                rows={6}
                                disabled={isSavingReview}
                              />
                              <div className="review-edit-controls">
                                <div className="character-count">
                                  {reviewText.length}/2000 символов
                                </div>
                                <div className="review-buttons">
                                  <button
                                    onClick={cancelEditReview}
                                    className="review-btn cancel-btn"
                                    disabled={isSavingReview}
                                  >
                                    Отмена
                                  </button>
                                  <button
                                    onClick={saveReview}
                                    className="review-btn save-btn"
                                    disabled={isSavingReview || !reviewText.trim()}
                                  >
                                    {isSavingReview ? 'Сохранение...' : 'Сохранить отзыв'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="review-display-mode">
                              {userMovie.review ? (
                                <div className="review-content">
                                  <div className="review-text">
                                    {userMovie.review}
                                  </div>
                                  <div className="review-footer">
                                    <span className="review-length">
                                      {userMovie.review.length} символов
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <div className="no-review">
                                  <p className="no-review-text">Еще нет впечатлений о фильме</p>
                                  <button
                                    onClick={() => startEditReview(userMovie)}
                                    className="add-review-btn"
                                  >
                                    Написать отзыв
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}