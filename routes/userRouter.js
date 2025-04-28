const express=require('express')

const router=express.Router();
const userController=require('../controllers/user/userController');
const passport = require('passport');


router.get("/pageNotFound",userController.pageNotFound)
router.get("/",userController.loadHomePage)
router.get("/signUp",userController.loadSignupPage)
router.post("/signUp",userController.userSignup)
router.post('/otp-varify',userController.varifyOtp)
router.post('/resend-otp',userController.resendOtp)

router.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}))

router.get('/auth/google/callback',passport.
    authenticate('google',{failureRedirect:'/signUp'}),(req,res)=>{res.redirect("/")})

router.get("/login",userController.loadLoginPage)
router.post("/login",userController.login)
router.get("/logout",userController.logout)





module.exports=router