const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const session = require('express-session');  // 세션 미들웨어 추가

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// SQLite 데이터베이스 연결
const db = new sqlite3.Database('site.db');

// User 모델 정의 (테이블 생성은 여기서만 예시로 보여줌)
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL
    )
  `);
});

app.set('view engine', 'ejs');
app.set('views', './views');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'your_secret_key',
  resave: true,
  saveUninitialized: true
}));  // 세션 미들웨어 설정

// 메인 페이지 렌더링
app.get('/', (req, res) => {
  res.render('index', { title: 'Chat App' });
});

// 로그인 페이지 렌더링
app.get('/login', (req, res) => {
  res.render('login', { title: 'Login' });
});

// 로그인 요청 처리
app.post('/login', (req, res) => {
  const { username, pw } = req.body;

  // 데이터베이스에서 사용자 정보 확인
  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err) {
      return res.json({ success: false, message: '에러가 발생했습니다.' });
    }

    if (user) {
      // 비밀번호 확인
      if (bcrypt.compareSync(pw, user.password)) {
        // 로그인 성공 시 해당 사용자 ID를 세션에 저장
        req.session.user_id = user.id;  // 수정: session -> req.session
        // 로그인 성공 시 JSON 응답 반환
        return res.json({ success: true, message: '로그인이 성공했습니다.' });
      } else {
        return res.json({ success: false, message: '비밀번호가 틀렸습니다. 다시 입력해주세요.' });
      }
    } else {
      return res.json({ success: false, message: '아이디가 틀렸습니다. 다시 입력해주세요.' });
    }
  });
});

// 회원가입 페이지 렌더링
app.get('/join', (req, res) => {
  res.render('join', { title: 'Join' });
});

// 회원가입 요청 처리
app.post('/join', (req, res) => {
  const { na, email, id, pw, pw_check } = req.body;

  const response = {};

  if (!na || !email || !id || !pw || !pw_check) {
    response.message = '모든 필드를 입력하세요.';
    return res.json(response);
  }

  // 기존 사용자 확인
  db.get('SELECT * FROM users WHERE name = ? OR username = ? OR email = ?', [na, id, email], (err, existingUser) => {
    if (err) {
      response.message = '에러가 발생했습니다.';
      return res.json(response);
    }

    if (existingUser) {
      if (existingUser.name === na) {
        response.message = '이름을 이미 다른 사용자가 사용 중입니다. 다른 이름을 입력하세요.';
      } else if (existingUser.username === id) {
        response.message = '아이디를 이미 다른 사용자가 사용 중입니다. 다른 아이디를 입력하세요.';
      } else if (existingUser.email === email) {
        response.message = '이메일을 이미 다른 사용자가 사용 중입니다. 다른 이메일을 입력하세요.';
      }

      return res.json(response);
    }

    // 회원가입 로직
    const hashedPassword = bcrypt.hashSync(pw, 10); // 10은 saltRounds로서 암호화 강도를 나타냄
    const newUser = {
      name: na,
      email: email,
      username: id,
      password: hashedPassword
    };

    // 데이터베이스에 새로운 사용자 추가
    db.run('INSERT INTO users (name, email, username, password) VALUES (?, ?, ?, ?)',
      [newUser.name, newUser.email, newUser.username, newUser.password],
      (err) => {
        if (err) {
          response.message = '회원가입 중 에러가 발생했습니다.';
          return res.json(response);
        }

        response.message = '회원가입이 완료되었습니다.';
        response.success = true;
        return res.json(response);
      }
    );
  });
});

// 이하 추가적인 라우팅 및 로직 구현

io.on('connection', (socket) => {
  console.log('A user connected');

  // Handle chat messages
  socket.on('chat message', (msg) => {
    io.emit('chat message', msg);
  });

  // Handle user disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

server.listen(3000, () => {
  console.log('Server is running on port 3000');
});
