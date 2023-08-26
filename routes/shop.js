var router = require('express').Router();//router필수, express라이브러리의 Router함수를 쓰겠습니다

function 로그인했니(요청, 응답, next){
    if (요청.user){
        next()
    } else{
        응답.send('로그인 안하셨는데요?')
    }
}

router.use('/shirts', 로그인했니);//특정 URL에만 적용하는 미들웨어

router.get('/shop/shirts', 로그인했니, function(요청, 응답){
    응답.send('셔츠 판매 페이지입니다.');
});
  
router.get('/shop/pants', 로그인했니, function(요청, 응답){
    응답.send('바지 파는 페이지입니다.');
});

module.exports = router;//module.expoerts=내보낼 변수명   require('변수명')/require('라이브러리명')

