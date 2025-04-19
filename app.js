const express=require('express')
const app= express();
const path=require('path');
const hbs=require('hbs')
const { engine } = require('express-handlebars');
const env=require("dotenv").config();
const connectDb=require("./config/db")
const userRouter=require('./routes/userRouter')

connectDb();


app.use(express.json());
app.use(express.urlencoded({extended:true}))



app.engine('hbs', engine({
    extname: 'hbs',
    defaultLayout: 'layout',
    layoutsDir: path.join(__dirname, 'views/layouts'),
    partialsDir: [
      path.join(__dirname, 'views/partials/user'),
      path.join(__dirname, 'views/partials/admin')
    ]
  }));

//   hbs.registerPartials(path.join(__dirname, 'views/partials/user'));
app.set('view engine','hbs')
app.set("views",[path.join(__dirname,'views/user'),path.join(__dirname,'views/admin')])
app.use(express.static(path.join(__dirname,'public')))


app.use('/',userRouter)



app.listen(process.env.PORT,()=>{
    console.log("Server Running........")
    
})



module.exports = app