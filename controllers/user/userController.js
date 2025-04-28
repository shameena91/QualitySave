const User=require("../../models/userSchema")
const nodeMailer=require('nodemailer')
const env=require("dotenv").config()
const bcrypt=require("bcrypt") 

const pageNotFound=async(req,res)=>{
    try{
res.render("page-404")
    }catch(error)
    {
        res.redirect("/pageNotFound")
    }
}


const loadHomePage=async (req,res)=>{
    try{
        const userId=req.session.user;
        if(userId)
        {
            const userData=await User.findOne({_id:userId}).lean();
            console.log(userData.name)
            res.render("userHome",{user:userData})
        }else{
            return res.render("userHome")
        }
       

    }catch(error)
    {
console.log("Home page not found")
res.status(500).send("server error")
    }
}

const loadSignupPage= async(req,res)=>{
    try{
        // console.log("Home controller reached ✅");
        res.render('signUp')
    }catch(error)
    {
        console.log("Home page not found")
        res.status(500).send("server error") 
    }
}
// generate otp
function generateOtp()
{
    return Math.floor(100000 + Math.random()*900000).toString()
}

// sending otp to mail
async function sendVerificationEmail(email,otp)
{
    try {
const transport=nodeMailer.createTransport({
    service:'gmail',
    port:587,
    secure:false,
    requireTLS:true,
    auth:{
        user:process.env.NODEMAILER_EMAIL,
        pass:process.env.NODEMAILER_PASSWORD
    }
})
const info=await transport.sendMail({
    from:process.env.NODEMAILER_EMAIL,
    to:email,
    subject:"Verify your account ",
    text:`Your OPT is ${otp}`,
    html:`<b>Yout OTP: ${otp} </b>`
})
console.log("Email send response:", info)
 return info.accepted.length>0       
    } catch (error) {
       console.log("Error sending Email",error)
       return false; 
    }
}

const userSignup=async(req,res)=>{
    
    try{
       
        const{name,phone,email,password,cpassword}=req.body
        if(password!=cpassword)
        {
            return res.render("signUp",{message:"password not matched"})
        }
        console.log(email)
        const findUser=await User.findOne({email});
        if(findUser)
        {
            return res.render("signUp",{message:"User already exists"})
        }
        const otp=generateOtp();
        const emailSent=await sendVerificationEmail(email,otp)
        if(!emailSent)
        {
            
            return res.render("signUp", { message: "Failed to send OTP. Please try again." });
            // return res.json("email.error")
          
        }
        req.session.userOtp=otp
        req.session.userData={email,password,name,phone}
        console.log("OTP sent",otp)
        res.render("otp-varify")
        
       

    }catch(error)
    {
console.log("sighnup error",error)
res.redirect("/pageNotFound")
res.status(500).send("signserver Error")
    }
}

const securepassword=async(password)=>{
    try {
        const passwordHash=await bcrypt.hash(password,10)
        return passwordHash;       
    } catch (error) {
        console.log("Error hashing password:", error);
        
        throw new Error("Password hashing failed");
    }
}
// OTP verification
const varifyOtp = async(req,res)=>{
try{
    const {otp}=req.body
    console.log(otp)
    console.log("sessionotp",req.session.userOtp)
    if(String(otp) === String(req.session.userOtp))
    {
        const user=req.session.userData
        const passwordHash=await securepassword(user.password)
        console.log("sessionotp",req.session.userOtp)

        const saveUserData=new User({
            name:user.name,
            email:user.email,
            phone:user.phone,
            password:passwordHash,
           
        })
        
        if (user.googleId) {
            userData.googleId = user.googleId;
        }
        await saveUserData.save()
        req.session.user=saveUserData._id;
        res.json({success:true,redirectUrl:"/"})
    }else{
        console.log("mismatch",req.session.userOtp)
        res.status(400).json({success:false,message:"invalid OTP,Please Try again"})
    }

}catch(error)
{
console.log("Error in varifying OTP",error)
res.status(500).json({success:false,message:"an error occured"})
}
}

const resendOtp= async(req,res)=>{
    try {
        const{email}=req.body;
        if(!email)
        {
            return res.status(400).json({success:false,message:'Email not found in session'})
        }
        const otp=generateOtp();
        req.session.userOtp=otp
        const emailsent=await sendVerificationEmail(email,otp)
        if(emailsent)
        {
            console.log("ResendOTP",otp)
            res.status(200).json({success:true,message:"OTP resend successfully"})
        }else{
            res.status(500).json({success:false,message:"failed to  resend OTP.please try again"})

        }

    } catch (error) {
        console.error("Error resnding OTP")
        res.status(500).json({success:false,message:"Internal server error.Please try again later"})
    }
}

const loadLoginPage= async (req,res)=>{
try {
    if(!req.session.user)
    {
        return res.render("login")
    }else{
        res.redirect("/")
    }
} catch (error) {
    res.redirect("/PageNotFound")
}
}

const login = async (req,res)=>{
    try {
        const {email,password}=req.body
        const findUser= await User.findOne({isAdmin:0,email})
        if(!findUser)
        {
            return res.render("login",{message:"user not found"})
        }
        if(findUser.isBlocked)
            {
                return res.render("login",{message:"User is blocked by admin"})
            }

        const passwordMatch=await bcrypt.compare(password,findUser.password)
        if(!passwordMatch)
        {
            {
                return res.render("login",{message:"Invalid credentials"})
            }
        }
        req.session.user=findUser._id;
        res.redirect("/")

    } catch (error) {
        console.log("loginError",error)
        res.render("login",{message:"login Failed.please try again later"})
    }
}

const logout= async(req,res)=>{
    try {
        req.session.destroy((err)=>{
            if(err)
            {
                console.log("session destruction error");
                return res.redirect("/pageNotFound")               
            }
            return res.redirect("/login")
        })
    } catch (error) {
        console.log("Logout error",error)
        return res.redirect("/pageNotFound") 
    }

}
module.exports={loadHomePage,
    pageNotFound,
    loadSignupPage,
    varifyOtp,
    userSignup,
    resendOtp,
    loadLoginPage,
    login,
    logout
}