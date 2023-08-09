const express = require('express');
const app = express();
app.use(express.urlencoded({extended: true})) 
const MongoClient = require('mongodb').MongoClient;
app.set('view engine', 'ejs');

var db;//변수 하나 필요
MongoClient.connect('mongodb+srv://admin:qwer1234@cluster0.lprzs8w.mongodb.net/?retryWrites=true&w=majority', function(에러, client){
    //연결되면 할일
    if(에러) return console.log(에러)

    db = client.db('todoapp');//todoapp이라는 database(폴더)에 연결

    app.listen(3000, function (){//listen(파라미터1(서버띄울 포트번호),파라미터2(띄운 후 실행할 코드))
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
    응답.sendFile(__dirname + '/index.html')//현재파일의 경로
});

app.get('/write', function(요청, 응답) { 
    응답.sendFile(__dirname +'/write.html')
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
