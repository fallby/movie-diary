const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.port || 5000;

const mysql = require('mysql');
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'movie_diary'
});

connection.connect(function (err) {
  if (err) {
    return console.error("Ошибка: " + err.message);
  } else {
    console.log("Подключение к серверу MySQL успешно установлено");
  }
});

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

app.listen(port, () => console.log(`Listening on port ${port}`));

app.post('/api/registration', (req, res) => {
  const { username, email, password } = req.body;

  const checkQuery = 'SELECT * FROM users WHERE username = ? OR email = ?';
  connection.query(checkQuery, [username, email], (checkErr, existing) => {
    if (checkErr) {
      return res.json({ success: false, error: checkErr.message });
    }

    if (existing.length > 0) {
      return res.json({ success: false, error: 'Пользователь уже существует' });
    }

    const insertQuery = 'INSERT INTO users (username, email, password) VALUES (?, ?, ?)';
    connection.query(insertQuery, [username, email, password], (insertErr, result) => {
      if (insertErr) {
        return res.json({ success: false, error: insertErr.message });
      }

      const newUser = userResults[0];
      res.json({
        success: true,
        user: {
          id: newUser.user_id,
          username: newUser.username,
          email: newUser.email
        }
      });
    });
  });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  const query = 'SELECT user_id, username, email FROM users WHERE username = ? AND password = ?';

  connection.query(query, [username, password], (err, results) => {
    if (err) {
      return res.json({ success: false, error: 'Ошибка базы данных' });
    }

    if (results.length === 0) {
      return res.json({ success: false, error: 'Неверный логин или пароль' });
    }

    const user = results[0];

    res.json({
      success: true,
      user: {
        id: user.user_id,
        username: user.username,
        email: user.email
      }
    });
  });
});

app.get('/api/movies', (req, res) => {
  connection.query('SELECT movie_id as id, title, year, genre, director FROM movies ORDER BY title', (err, results) => {
    if (err) {
      return res.json([]);
    }

    res.json(results);
  });
});

app.post('/api/user/movies', (req, res) => {
  const { userId, movieId } = req.body;

  const checkQuery = 'SELECT * FROM user_movies WHERE user_id = ? AND movie_id = ?';
  connection.query(checkQuery, [userId, movieId], (checkErr, existing) => {
    if (checkErr) {
      return res.json({ success: false, error: checkErr.message });
    }

    if (existing.length > 0) {
      return res.json({
        success: false,
        error: 'Фильм уже добавлен в ваш дневник'
      });
    }

    let statusId = 1;

    const insertQuery = 'INSERT INTO user_movies (user_id, movie_id, status_id, rating, review) VALUES (?, ?, ?, ?, ?)';
    connection.query(insertQuery, [userId, movieId, statusId, null, ''], (insertErr, result) => {
      if (insertErr) {
        return res.json({ success: false, error: insertErr.message });
      }

      res.json({
        success: true,
        message: 'Фильм добавлен в дневник',
        id: result.insertId
      });
    });
  });
});

app.get('/api/user/:userId/movies', (req, res) => {
  const userId = req.params.userId;

  const query = 'SELECT user_movie_id, user_id, movie_id, status_id, rating FROM user_movies WHERE user_id = ?';

  connection.query(query, [userId], (err, results) => {
    if (err) {
      return res.json([]);
    }

    const moviesWithStatus = results.map(movie => {
      let status = 'planned';
      if (movie.status_id === 2) status = 'watching';
      if (movie.status_id === 3) status = 'watched';

      return {
        id: movie.user_movie_id,
        user_id: movie.user_id,
        movie_id: movie.movie_id,
        status_id: movie.status_id,
        rating: movie.rating,
        status: status
      };
    });

    res.json(moviesWithStatus);
  });
});

app.put('/api/user/movies/:id', (req, res) => {
  const { status } = req.body;
  const userMovieId = req.params.id;

  const statusMap = {
    'planned': 1,
    'watching': 2,
    'watched': 3
  };

  const statusId = statusMap[status];

  connection.query(
    'UPDATE user_movies SET status_id = ? WHERE user_movie_id = ?',
    [statusId, userMovieId],
    (err, result) => {
      if (err) {
        return res.json({ success: false, error: err.message });
      }
      res.json({ success: true });
    }
  );
});

app.put('/api/user/movies/:id/rate', (req, res) => {
  const { rating } = req.body;
  const userMovieId = req.params.id;

  connection.query(
    'UPDATE user_movies SET rating = ? WHERE user_movie_id = ?',
    [rating, userMovieId],
    (err, result) => {
      if (err) {
        return res.json({ success: false, error: err.message });
      }

      res.json({ success: true });
    }
  );
});

app.put('/api/user/movies/:id/review', (req, res) => {
  const userMovieId = req.params.id;
  const { review } = req.body;

  connection.query(
    'UPDATE user_movies SET review = ? WHERE user_movie_id = ?',
    [review, userMovieId],
    (err, result) => {
      if (err) {
        return res.json({ success: false, error: err.message });
      }

      if (result.affectedRows === 0) {
        return res.json({ success: false, error: 'Запись не найдена' });
      }

      res.json({
        success: true,
        message: review ? 'Отзыв сохранен' : 'Отзыв удален'
      });
    }
  );
});