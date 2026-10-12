const express = require("express");
const path = require("path");
const cors = require("cors");

// Импортируем массив пользователей из отдельного файла
const users = require("./users");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.use((req, res, next) => {
  console.log(`[${req.method}]: ${req.url}`);
  next();
});

/* === CRUD ОПЕРАЦИИ === */

/* 1. GET - Получить всех пользователей */
app.get("/api/users", (req, res) => {
  res.json(users);
});

/* 2. POST - Добавить нового пользователя */
app.post("/api/users", (req, res) => {
  const { name, age, year, profession } = req.body;

  if (!name || !age || !profession) {
    return res.status(400).json({ error: "Заполните обязательные поля: name, age, profession" });
  }

  const newUser = {
    id: users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1,
    name,
    age: parseInt(age),
    year: parseInt(year) || new Date().getFullYear() - parseInt(age),
    profession
  };

  users.push(newUser);
  res.status(201).json({ message: "Пользователь успешно добавлен", user: newUser });
});

/* 3. PUT - Изменить пользователя по ID */
app.put("/api/users/:id", (req, res) => {
  const userId = parseInt(req.params.id);
  const { name, age, year, profession } = req.body;
  
  const userIndex = users.findIndex(u => u.id === userId);

  if (userIndex !== -1) {
    /* Если новое значение передано в req.body, берем его. Иначе оставляем старое. */
    users[userIndex] = {
      ...users[userIndex],
      name: name || users[userIndex].name,
      age: age ? parseInt(age) : users[userIndex].age,
      year: year ? parseInt(year) : users[userIndex].year,
      profession: profession || users[userIndex].profession
    };
    
    res.json({ message: "Данные пользователя успешно обновлены", user: users[userIndex] });
  } else {
    res.status(404).json({ error: "Пользователь с таким ID не найден" });
  }
});

/* 4. DELETE - Удалить пользователя по ID */
app.delete("/api/users/:id", (req, res) => {
  const userId = parseInt(req.params.id);
  const userIndex = users.findIndex(u => u.id === userId);

  if (userIndex !== -1) {
    const deletedUser = users.splice(userIndex, 1);
    res.json({ message: `Пользователь ${deletedUser[0].name} успешно удален` });
  } else {
    res.status(404).json({ error: "Пользователь с таким ID не найден" });
  }
});

/* Запуск сервера */
app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
});
