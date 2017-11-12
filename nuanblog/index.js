const path = require('path')
const express = require('express')
const session = require('express-session')
const MongoStore = require('connect-mongo')(session)
const RedisStore = require('connect-redis')(session)
const flash = require('connect-flash')
const config = require('config-lite')(__dirname)
const routes = require('./routes')
const pkg = require('./package')
const winston = require('winston')
const expressWinston = require('express-winston')


const app = express();

//设置模块目录
app.set('views', path.join(__dirname, 'views'))
//设置模版引擎为ejs
app.set('view engine', 'ejs')

//设置静态文件目录
app.use(express.static(path.join(__dirname, 'public')))

//session中间件
app.use(session({
    name: config.session.key,   //设置cookie中保存session id的字段名称
    secret: config.session.secret,  //通过设置secret来计算hash值并放在cookie中，使产生的signedCookie防篡改
    resave: true,       //强制更新session
    saveUninitialized: false,   //设置为false,强制创建一个session，即使用户未登录
    cookie: {
        maxAage: config.session.maxAage     //过期期间，过期后cookie中的session id自动删除
    },
    // store: new MongoStore({     //将session存储到mongodb
    //     url: config.mongodb
    // })
    store: new RedisStore({  //将session存储到redis
       url: config.redis
    })
}))

//flash中间件，用来显示通知
app.use(flash())

//处理表单及文件上传的中间件
app.use(require('express-formidable')({
    uploadDir: path.join(__dirname, 'public/img'), //上传文件目录
    keepExtensions: true //保留后缀
}))

//设置模版全局变量
app.locals.blog = {
    title: pkg.name,
    description: pkg.description
}
//添加模块必需的三个变量
app.use(function(req, res, next){
    res.locals.user = req.session.user
    res.locals.success = req.flash('success').toString()
    res.locals.error = req.flash('error').toString()
    next();
})

//正常请求的日志
app.use(expressWinston.logger({
    transports:[
        new (winston.transports.Console)({
            json: true,
            colorize: true
        }),
        new winston.transports.File({
            filename: 'logs/success.log'
        })
    ]
}))

//路由
routes(app)

//错误请求的日志
app.use(expressWinston.errorLogger({
    transports:[
        new winston.transports.Console({
            json: true,
            colorize: true
        }),
        new winston.transports.File({
            filename: 'logs/error.log'
        })
    ]
}))

//error
app.use(function(err, req, res, next){
    req.flash('error', err.message)
    res.redirect('/posts')
})

//监听端口，启动程序
app.listen(config.port, function(){
    console.log(`${pkg.name} listening on port ${config.port}`)
})
