const User=require("../../models/userSchema")
const nodeMailer=require('nodemailer')
const bcrypt=require('bcrypt')
const env=require("dotenv").config()
const session =require("express-session")

const securePassword=async(password)=>{
    try {
        if(!password)
        {
            throw new Error("Invalid password input");
        }
        const passwordHash=await bcrypt.hash(password,10)
        return passwordHash;       
    } catch (error) {
        console.log("Error hashing password:", error);
        
        throw new Error("Password hashing failed");
    }
}
function generateOtp()
{
    const digits="1234567890"
    let otp="";
    for(let i=0;i<6;i++)
    {
        otp+=digits[Math.floor(Math.random()*10)]
    }
    return otp;
}

const sendVarificationEmail = async (email,otp)=>{
     try {
    const transporter=nodeMailer.createTransport({
        service:'gmail',
        port:587,
        secure:false,
        requireTLS:true,
        auth:{
            user:process.env.NODEMAILER_EMAIL,
            pass:process.env.NODEMAILER_PASSWORD
        }
    })
    const info=await transporter.sendMail({
        from:process.env.NODEMAILER_EMAIL,
        to:email,
        subject:"Your OTP for password resette ",
        text:`Your OTP is ${otp}`,
        html:`<b>Yout OTP: ${otp} </b>`
    })
    console.log("Email send response:", info.messageId)
    return true;
        
        } catch (error) {
           console.log("Error sending Email",error)
           return false; 
        }

}

const loadForgotPassword=async(req,res)=>{
    try {
        res.render("ForgotPassword")
    } catch (error) {
        res.redirect("/pageNotFound")
    }
}


const forgotPassword=async(req,res)=>{
    try {
    const {email}=req.body
    const findUser=await User.findOne({email:email});

        if(findUser){
            const otp=generateOtp();
            const emailSent=await sendVarificationEmail(email,otp)
            if(emailSent)
            {
                req.session.userOtp=otp
                req.session.email=email
                res.render("forgetPassOTP")
                console.log("reserOPT",otp)
            }else{
                res.json({success:false,message:"please try again later"})
            }
        }else{
            res.render("forgotPassword",{message:"UserWith this email doennot exist"})
        }
    } catch (error) {
        res.redirect("/pageNotFound")
    }
    
    
    }
    const forgotPassVarifyOtp = async (req, res) => {
        try {
          const enteredOtp = req.body.otp;
          const sessionOtp = req.session.userOtp;
      
          console.log("Entered OTP:", enteredOtp);
          console.log("Session OTP:", sessionOtp);
      
          if (!sessionOtp) {
            console.log("OTP expired. Please request a new one")
            return res.json({ success: false, message: "OTP expired. Please request a new one." });
          }
      
          if (enteredOtp === sessionOtp) {
         
            req.session.userOtp = null;
            console.log("resetPassword")
            return res.json({ success: true, redirectUrl: "/resetPassword" });
          } else {
            return res.json({ success: false, message: "OTP not matching" });
          }
        } catch (error) {
          console.log("Error in verifying OTP", error);
          return res.status(500).json({ success: false, message: "An error occurred" });
        }
      };
      

const getResetPassPage=async(req,res)=>{
    try {
        res.render("resetPassword")
    } catch (error) {
        res.redirect("pageNotFound")
    }
}
const resendForgotPass=async(req,res)=>{
    try {

        const otp=generateOtp();
        req.session.userOtp=otp
        req.session.email=email
        const emailSent=await sendVarificationEmail(email,otp)
                if(emailSent)
                {
                    console.log("reseendedOPT",otp)
                  res.status(200).json({success:true,message:"resend OTP successfully"})
                   
               
            }
        } catch (error) {
            console.log("Error in resending OTP",error)
            res.status(500).json({success:false,message:"Internal severError"})
        }
}

const resetPassword = async (req, res) => {
    try {
        const {newPass1, newPass2 } = req.body;
        console.log("newPass", newPass1);

        const email = req.session.email;

        if (!email) {
            return res.render("resetPassword", { message: "Session expired. Please try again." });
        }

        if (newPass1 === newPass2) {
            const passwordHash = await securePassword(newPass1); // 

            await User.updateOne(
                { email: email },
                { $set: { password: passwordHash } }
            );
            res.status(200).json({success:true,message:"Password change successsfully"})
            // res.redirect("/login");
        } else {
            
            res.render("resetPassword", { message: "Passwords do not match" });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({success:false,message:"Internal severError"})
    }
};

module.exports={
    loadForgotPassword,
    forgotPassword,
    forgotPassVarifyOtp,
    getResetPassPage,
    resendForgotPass,
    resetPassword
}