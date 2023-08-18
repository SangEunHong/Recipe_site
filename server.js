const express = require('express');
const app = express();
app.use(express.urlencoded({extended: true})) 
const MongoClient = require('mongodb').MongoClient;
const methodOverride = require('method-override')
app.use(methodOverride('_method'))
app.set('view engine', 'ejs');
app.use('/public', express.static('public'));
require('dotenv').config()

var db;//변수 하나 필요
MongoClient.connect('process.env.DB_URL', function(에러, client){
    //연결되면 할일
    if(에러) return console.log(에러)

    db = client.db('todoapp');//todoapp이라는 database(폴더)에 연결

    app.listen(process.env.PORT, function (){//listen(파라미터1(서버띄울 포트번호),파라미터2(띄운 후 실행할 코드))
        console.log('listening on 3000')//3000포트에 서버 띄어 주세요
    });

})



//누군가가 /pet으로 방문을 하면..
//pet 관련된 안내문을 띄워주자

app.get('/pet', function(요청, 응답){
    응답.send('펫용품 쇼핑할 수 있는 페이지입니다.')
});

app.get('/beauty', function(요청, 응답){
    응답.send('뷰티용품 쇼핑 페이지입니다.')
});

app.get('/', function(요청, 응답){
    응답.render(__dirname + '/views/index.ejs')//현재파일의 경로
});

app.get('/write', function(요청, 응답) { 
    응답.render(__dirname +'/views/write.ejs')
  });

app.post('/add', function (요청, 응답){//누가 폼에서 /add로 POST 요청하면
    응답.send('전송완료');
    db.collection('counter').findOne({name: '게시물갯수'}, function(에러, 결과){//DB.counter 내의 총게시물갯수를 찾음
        console.log(결과.totalPost)//총 게시물 갯수
        var 총게시물갯수 = 결과.totalPost;//let,const//총게시물갯수를 변수에 저장

        db.collection('post').insertOne({_id : 총게시물갯수 + 1, 제목: 요청.body.title, 날짜: 요청.body.date}, function(에러, 결과){//DB.post에 새게시물 기록함
            console.log('저장완료');
            //counter라는 콜렉션에 있는 totalPost 라는 항목도 1 증가시켜야함(수정);
            db.collection('counter').updateOne({name: '게시물갯수'},{ $inc : {totalPost:1}}, function(){//완료되면 DB.counter 내의 총 게시물갯수 +1
                if(에러){return console.log(에러)}
            })//데이터 수정시 operator를 써야함
        });//데이터 저장
    });

});

///list 로 GET요청으로 접속하면
//실제 DB에 저장된 데이터들로 예쁘게 꾸며진 HTML을 보여줌

app.get('/list', function(요청, 응답){

    db.collection('post').find().toArray(function(에러, 결과){
        console.log(결과);//DB에서 자료 찾아주세요
        응답.render('list.ejs', { posts : 결과});//찾은걸 ejs파일에 집어넣어주세요
    });


    //디비에 저장된 post라는 clooection안의 모든 데이터를 꺼내주세요
});

app.delete('/delete', function(요청, 응답){
    console.log(요청.body);
    요청.body._id = parseInt(요청.body._id);
    //요청.body에 담겨온 게시물번호를 가진 글을 db에서 찾아서 삭제해주세요
    db.collection('post').deleteOne(요청.body, function(에러, 결과){
        console.log('삭제완료');
        응답.status(200).send({ message  : '성공했습니다' });//응답코드 200을 보내주세요
    })
})

//detail 로  접속하면 detail.ejs 보여줌

app.get('/detail/:id', function(요청, 응답){
    db.collection('post').findOne({_id : parseInt(요청.params.id)}, function(에러, 결과){
        console.log(결과);
        응답.render('detail.ejs', { data : 결과 });
    })
    
})

app.get('/edit/:id', function(요청, 응답){//게시글마다 각각 다른 edit.ejs 내용이 필요
    db.collection('post').findOne({_id : parseInt(요청.params.id)}, function(에러, 결과){
        응답.render('edit.ejs', { post : 결과 })
    })
 
})
//서버로 PUT요청 들어오면 게시물 수정 처리하기
app.put('/edit', function(요청, 응답){
    //폼에서 전송한 제목,날짜로 db.collection('post')에서 게시물 찾아서 업데이트
    db.collection('post').updateOne({ _id : parseInt(요청.body.id) },{ $set : { 제목: 요청.body.title, 날짜: 요청.body.date }}, function(에러, 결과){
        console.log('수정완료')
        응답.redirect('/list')
     })
});

const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');

app.use(session({secret : '비밀코드', resave : true, saveUninitialized: false}));
app.use(passport.initialize());
app.use(passport.session()); 


app.get('/login', function(요청, 응답){
    //아이디 비번 맞으면 로그인 성공페이지로 보내주야함
    응답.render('login.ejs')
});

app.post('/login', passport.authenticate('local', {
    failureRedirect : '/fail'
}), function(요청, 응답){
    응답.redirect('/')
});

app.get('/mypage', 로그인했니, function(요청, 응답){
    console.log(요청.user)
    응답.render('mypage.ejs', {사용자 : 요청.user})
});

function 로그인했니(요청, 응답, next){
    if (요청.user){
        next()
    } else{
        응답.send('로그인 안하셨는데요?')
    }
}

passport.use(new LocalStrategy({
    usernameField: 'id',
    passwordField: 'pw',
    session: true,
    passReqToCallback: false,
  }, function (입력한아이디, 입력한비번, done) {
    console.log(입력한아이디, 입력한비번);
    db.collection('login').findOne({ id: 입력한아이디 }, function (에러, 결과) {
      if (에러) return done(에러)

      if (!결과) return done(null, false, { message: '존재하지않는 아이디요' })//DB에 아이디가 없으면
      if (입력한비번 == 결과.pw) {//DB에 아이디가 있으면 입력한 비번과 결과.pw비교
        return done(null, 결과)//done(서버에러, 성공시 사용자 DB데이터, 에러메시지)
      } else {
        return done(null, false, { message: '비번틀렸어요' })
      }
    })
  }));

  //id를 이용해서 세션을 저장시키는 코드(로그인 성공시 발동)
  passport.serializeUser(function(user, done){
    done(null, user.id)
  });

  
  //이 세션 데이터를 가진 사람을 DB에서 찾아주세요(마이페이지 접속시 발동)
  passport.deserializeUser(function(아이디, done){
    db.collection('login').findOne({id : 아이디}, function(에러, 결과){
        done(null, 결과)
    })
    
});