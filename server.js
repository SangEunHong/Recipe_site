const express = require('express');
const app = express();
app.use(express.urlencoded({extended: true})) 
const MongoClient = require('mongodb').MongoClient;
const methodOverride = require('method-override')
require('dotenv').config()
app.use(methodOverride('_method'))
app.set('view engine', 'ejs');
app.use('/public', express.static('public'));

const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');
let multer = require('multer');
let path = require('path');
let fs = require('fs');

// 파일 저장 설정
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/profile');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname); // 중복 방지
  }
});

var upload = multer({ storage: storage });

app.use(session({ secret: '비밀코드', resave: true, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

let db;
MongoClient.connect(process.env.DB_URL, function (에러, client) {
  //연결되면 할일
  if (에러) return console.log(에러);
  db = client.db('todoapp'); //todoapp이라는 database(폴더)에 연결
  app.listen(process.env.PORT, function () {
    console.log('listening on 8080'); //8080포트에 서버 띄어 주세요
  });
});

app.get('/', function (요청, 응답) {
  응답.render(__dirname + '/views/index.ejs');
});

app.get('/write', function (요청, 응답) {
  응답.render(__dirname + '/views/write.ejs');
});

//list 로 GET요청으로 접속하면 실제 DB에 저장된 데이터들로 예쁘게 꾸며진 HTML을 보여줌
app.get('/list', function (요청, 응답) {
  db.collection('post').find().sort({ _id: 1 }).toArray(function (에러, 결과) {
    응답.render('list.ejs', { posts: 결과 }); //찾은걸 ejs파일에 집어넣어주세요
  });
});

app.get('/search', (요청, 응답) => {
  const 검색어 = 요청.query.value?.split(' ') || [];
  const 검색조건 = [
    {
      $search: {
        index: 'todo_search',
        compound: {
          should: 검색어.map((단어) => ({
            text: {
              query: 단어,
              path: '제목',
              fuzzy: { maxEdits: 1 }
            }
          }))
        }
      }
    },
    { $limit: 10 }
  ];
  db.collection('post').aggregate(검색조건).toArray((에러, 결과) => {
    응답.render('search.ejs', { posts: 결과 });
  });
});

//detail 로 접속하면 detail.ejs 보여줌
app.get('/detail/:id', function (요청, 응답) {
  db.collection('post').findOne({ _id: parseInt(요청.params.id) }, function (에러, 결과) {
    응답.render('detail.ejs', { data: 결과 });
  });
});

//서버로 PUT요청 들어오면 게시물 수정 처리하기
app.put('/edit', function (요청, 응답) {
  db.collection('post').updateOne(
    { _id: parseInt(요청.body.id) },
    { $set: { 제목: 요청.body.title, 날짜: 요청.body.date } },
    function (에러, 결과) {
      응답.redirect('/list');
    });
});

app.get('/edit/:id', function (요청, 응답) {//게시글마다 각각 다른 edit.ejs 내용이 필요
  db.collection('post').findOne({ _id: parseInt(요청.params.id) }, function (에러, 결과) {
    응답.render('edit.ejs', { post: 결과 });
  });
});

passport.use(new LocalStrategy({
  usernameField: 'id',
  passwordField: 'pw',
  session: true,
  passReqToCallback: false,
}, function (입력한아이디, 입력한비번, done) {
  db.collection('login').findOne({ id: 입력한아이디 }, function (에러, 결과) {
    if (에러) return done(에러);
    if (!결과) return done(null, false, { message: '존재하지않는 아이디요' });
    if (입력한비번 == 결과.pw) return done(null, 결과);
    return done(null, false, { message: '비번틀렸어요' });
  });
}));

//id를 이용해서 세션을 저장시키는 코드(로그인 성공시 발동)
passport.serializeUser(function (user, done) {
  done(null, user.id);
});

//이 세션 데이터를 가진 사람을 DB에서 찾아주세요(마이페이지 접속시 발동)
passport.deserializeUser(function (아이디, done) {
  db.collection('login').findOne({ id: 아이디 }, function (에러, 결과) {
    done(null, 결과);
  });
});

function 로그인했니(요청, 응답, next) {
  if (요청.user) next();
  else 응답.status(401).send({ message: '로그인 필요' });
}

app.get('/login', function (요청, 응답) {
  응답.render('login.ejs');
});

app.post('/login', passport.authenticate('local', { failureRedirect: '/fail' }), function (요청, 응답) {
  응답.redirect('/');
});

//</회원가입>
//저장전에 id가 이미 있는지 먼저 찾아 봐야함
//id에 알파벳 숫자만 잘 들어 있는지
//비번 저장전에 암호화 했는지
app.post('/register', function (요청, 응답) {
  db.collection('login').insertOne({ id: 요청.body.id, pw: 요청.body.pw }, function () {
    응답.redirect('/');
  });
});

app.get('/mypage', 로그인했니, function (요청, 응답) {
  응답.render('mypage.ejs', { 사용자: 요청.user });
});

app.post('/mypage/upload', 로그인했니, upload.single('profile'), function (req, res) {
  // 프로필 이미지 업로드 후 DB에 저장
  const 파일이름 = req.file.filename;
  db.collection('login').updateOne({ id: req.user.id }, { $set: { profileImage: 파일이름 } }, function () {
    res.redirect('/mypage');
  });
});

app.post('/mypage/update', 로그인했니, function (req, res) {
  // 이름과 비밀번호 수정 처리
  const 수정내용 = {};
  if (req.body.name) 수정내용.name = req.body.name;
  if (req.body.pw && req.body.pw !== '****') 수정내용.pw = req.body.pw;
  db.collection('login').updateOne({ id: req.user.id }, { $set: 수정내용 }, function () {
    res.redirect('/mypage');
  });
});

app.post('/add', function (요청, 응답) {
  //누가 폼에서 /add로 POST 요청하면
  응답.redirect('/list');
  db.collection('counter').findOne({ name: '게시물갯수' }, function (에러, 결과) {
    //DB.counter 내의 총게시물갯수를 찾음
    const 총게시물갯수 = 결과.totalPost;
    const 저장할것 = {
      _id: 총게시물갯수 + 1,
      작성자: 요청.user._id,
      제목: 요청.body.title,
      날짜: 요청.body.date,
    };
    db.collection('post').insertOne(저장할것, function () {
      //counter라는 콜렉션에 있는 totalPost 라는 항목도 1 증가시켜야함(수정);
      db.collection('counter').updateOne({ name: '게시물갯수' }, { $inc: { totalPost: 1 } });
    });
  });
});

app.delete('/delete', 로그인했니, function (요청, 응답) {
  // 게시물 삭제 처리
  const 삭제할데이터 = { _id: parseInt(요청.body._id), 작성자: 요청.user.id };
  db.collection('post').deleteOne(삭제할데이터, function (에러, 결과) {
    if (에러) return 응답.status(500).send({ message: '서버 에러' });
    if (결과.deletedCount === 1) 응답.status(200).send({ message: '삭제 완료했습니다' });
    else 응답.status(404).send({ message: '삭제할 게시물이 없습니다' });
  });
});

//고객이 /경로로 요청했을때 이런 미들웨어 적용해주세요
app.use('/', require('./routes/shop.js'));
app.use('/board', require('./routes/board.js'));

// 업로드 페이지 GET: 업로드된 파일 목록도 함께 렌더링
app.get('/upload', function (req, res) {
  const folderPath = path.join(__dirname, 'public/upload');
  fs.readdir(folderPath, (err, files) => {
    if (err) return res.send('파일 목록 불러오기 실패');
    res.render('upload.ejs', { fileList: files });
  });
});

// 업로드 POST
app.post('/upload', upload.single('profile'), function (req, res) {
  res.redirect('/upload');
});

// 업로드된 이미지 접근 라우터
app.get('/upload/:imageName', function (req, res) {
  res.sendFile(__dirname + '/public/upload/' + req.params.imageName);
});