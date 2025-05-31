const express=require('express')
const app= express();
const path=require('path');
const morgan = require('morgan');
const passport=require('./config/passport')
const puppeteer = require('puppeteer');
const hbs=require('hbs')
const { engine } = require('express-handlebars');
const session=require('express-session')
const env=require("dotenv").config();
const connectDb=require("./config/db")
const userRouter=require('./routes/userRouter')
const adminRouter=require('./routes/adminRouter')
const errorHandler = require('./middlewares/errorHandler');

connectDb();

app.use(morgan('dev'));

app.use(express.json());
app.use(express.urlencoded({extended:true}))
app.use(session({
  secret:process.env.SESSION_SECRET,
  resave:false,
  saveUninitialized:true,
  cookie:{
     
      secure:false,
      httpOnly:true,
      maxAge:1000*60*60*72,
  }

}))


app.use(passport.initialize());
app.use(passport.session());
app.use((req, res, next) => {
  res.locals.currentUser = req.user || null;
  next();
})
app.use((req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
});



app.engine('hbs', engine({
    extname: 'hbs',
    defaultLayout: 'layout',
    layoutsDir: path.join(__dirname, 'views/layouts'),
    partialsDir: [
      path.join(__dirname, 'views/partials/user'),
      path.join(__dirname, 'views/partials/admin')
    ],
    helpers: {
      eq: (a, b) => a === b,
      add: (a, b) => a + b,
      sub: (a, b) => a - b,
      mul: (a, b) => a * b,
      and: (a, b) => a && b,
      gt: (a,b)=> a > b,
      or: (a,b)=> a || b,
      not: value => !value,
      range: (start, end) => {
        return Array.from({ length: end - start + 1 }, (_, i) => start + i);
    },
    json:(context)=>{
      return JSON.stringify(context);
    },
    formatDate:(date)=>{
      return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
    },
    runtimeOptions: {
      allowProtoPropertiesByDefault: true,   // to avoid prototype access errors
      allowProtoMethodsByDefault: true
    }
    }
  }));


//   hbs.registerPartials(path.join(__dirname, 'views/partials/user'));
app.set('view engine','hbs')
app.set("views",[path.join(__dirname,'views/user'),path.join(__dirname,'views/admin')])
app.use(express.static(path.join(__dirname,'public')))


app.use('/',userRouter)

app.use('/',adminRouter)




app.use(errorHandler);
app.listen(process.env.PORT,()=>{
    console.log("Server Running........")
    
})



module.exports = app