const User = require("../../models/userSchema");
const nodeMailer = require("nodemailer");
const bcrypt = require("bcrypt");
const env = require("dotenv").config();
const session = require("express-session");
const fs = require("fs");
const path = require("path");

const securePassword = async (password) => {
  try {
    if (!password) {
      throw new Error("Invalid password input");
    }
    const passwordHash = await bcrypt.hash(password, 10);
    return passwordHash;
  } catch (error) {
    console.log("Error hashing password:", error);

    throw new Error("Password hashing failed");
  }
};
function generateOtp() {
  const digits = "1234567890";
  let otp = "";
  for (let i = 0; i < 6; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
}

const sendVarificationEmail = async (email, otp) => {
  try {
    const transporter = nodeMailer.createTransport({
      service: "gmail",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWORD,
      },
    });
    const info = await transporter.sendMail({
      from: process.env.NODEMAILER_EMAIL,
      to: email,
      subject: "Your OTP for password resette ",
      text: `Your OTP is ${otp}`,
      html: `<b>Yout OTP: ${otp} </b>`,
    });
   
    return true;
  } catch (error) {
    console.log("Error sending Email", error);
    return false;
  }
};

const loadForgotPassword = async (req, res) => {
  try {
    res.render("forgotPassword");
  } catch (error) {
    res.redirect("/pageNotFound");
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const findUser = await User.findOne({ email: email });

    if (findUser) {
      const otp = generateOtp();
      const emailSent = await sendVarificationEmail(email, otp);
      if (emailSent) {
        req.session.userOtp = otp;
        req.session.email = email;
        res.render("forgetPassOTP");
        console.log("reserOPT", otp);
      } else {
        res.json({ success: false, message: "please try again later" });
      }
    } else {
      res.render("forgotPassword", {
        message: "UserWith this email doennot exist",
      });
    }
  } catch (error) {
    res.redirect("/pageNotFound");
  }
};
const forgotPassVarifyOtp = async (req, res) => {
  try {
    const enteredOtp = req.body.otp;
    const sessionOtp = req.session.userOtp;

 

    if (!sessionOtp) {
     
      return res.json({
        success: false,
        message: "OTP expired. Please request a new one.",
      });
    }

    if (enteredOtp === sessionOtp) {
      req.session.userOtp = null;
   
      return res.json({ success: true, redirectUrl: "/resetPassword" });
    } else {
      return res.json({ success: false, message: "OTP not matching" });
    }
  } catch (error) {
    console.log("Error in verifying OTP", error);
    return res
      .status(500)
      .json({ success: false, message: "An error occurred" });
  }
};

const getResetPassPage = async (req, res) => {
  try {
    res.render("resetPassword");
  } catch (error) {
    res.redirect("pageNotFound");
  }
};
const resendForgotPass = async (req, res) => {
  try {
    const otp = generateOtp();
    req.session.userOtp = otp;
    req.session.email = email;
    const emailSent = await sendVarificationEmail(email, otp);
    if (emailSent) {
      console.log("reseendedOPT", otp);
      res
        .status(200)
        .json({ success: true, message: "resend OTP successfully" });
    }
  } catch (error) {
    console.log("Error in resending OTP", error);
    res.status(500).json({ success: false, message: "Internal severError" });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { newPass1, newPass2 } = req.body;
   

    const email = req.session.email;

    if (!email) {
      return res.render("resetPassword", {
        message: "Session expired. Please try again.",
      });
    }

    if (newPass1 === newPass2) {
      const passwordHash = await securePassword(newPass1); //

      await User.updateOne(
        { email: email },
        { $set: { password: passwordHash } }
      );
      res
        .status(200)
        .json({ success: true, message: "Password change successsfully" });
      // res.redirect("/login");
    } else {
      res.render("resetPassword", { message: "Passwords do not match" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal severError" });
  }
};

// userProgile management

const userProfile = async (req, res) => {
  try {
    const userId = req.session.user;
    const userData = await User.findById({ _id: userId }).lean();
    res.render("userProfile", {
      user: userData,
    });
  } catch (error) {
    console.error("eroor occured when retrieving profile Data", error);
    res.redirect("/pageNotFound");
  }
};

const editUserProfile = async (req, res) => {
  try {
    const { name, gender, phone, email } = req.body;
    const profileImage = req.file;
    const userId = req.session.user;

    const updateData = {
      name,
      gender,
      phone,
      email,
    };

    if (profileImage) {
      updateData.profileImage = profileImage.filename;
    } else {
      updateData.profileImage = null;
    }

    await User.findByIdAndUpdate(userId, updateData, { new: true });

    res.status(200).json({ success: true, message: "Updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Something went wrong" });
  }
};
const deleteProfileImage = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.profileImage) {
      const imagePath = path.join(
        "public",
        "uploads",
        "re-image",
        user.profileImage
      );
    

      try {
        await fs.promises.unlink(imagePath);
      } catch (err) {
        return res.status(500).json({ error: "Failed to delete image file" });
      }

      user.profileImage = null;
      await user.save();

      return res
        .status(200)
        .json({ message: "Profile image removed successfully" });
    } else {
      return res.status(400).json({ error: "No profile image to remove" });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const getChangeEmail = async (req, res) => {
  try {
    res.render("change-email");
  } catch (error) {}
};

const varifyChangeEmail = async (req, res) => {
  try {
    const { email } = req.body;
  
    const findUser = await User.findOne({ email: email });
  

    if (findUser) {
      const otp = generateOtp();
     
      const emailSent = await sendVarificationEmail(email, otp);
      if (emailSent) {
        req.session.userOtp = otp;
        req.session.email = email;
        req.session.userData = req.body;
        res.render("change-email-otp");
       
      } else {
        res.json({ message: "please try again later" });
      }
    } else {
      res.render("change-email", {
        message: "UserWith this email doennot exist",
      });
    }
  } catch (error) {
    console.log(error);
    res.redirect("/pageNotFound");
  }
};
const varifyEmailOtp = async (req, res) => {
  try {
    const enteredOtp = req.body.otp;
    const sessionOtp = req.session.userOtp;


    if (!sessionOtp) {
      
      return res.render("change-email-otp", {
        message: "OTP expired. Please request a new one.",
      });
    }

    if (enteredOtp === sessionOtp) {
      req.session.userOtp = null;

      const userData = req.session.userData;

      return res.render("new-email", {
        userData,
      });
    } else {
      return res.render("change-email-otp", {
        message: "OTP not matching",
        userData: req.session.userData,
      });
    }
  } catch (error) {
    console.error("Error in OTP verification:", error);
    res.redirect("/pageNotFound");
  }
};

const updateEmail = async (req, res) => {
  try {
    const { newEmail } = req.body;
    const userId = req.session.user;
    await User.findByIdAndUpdate(userId, { email: newEmail });
    res.redirect("/user-profile");
  } catch (error) {
    res.redirect("/pageNotFound");
  }
};

const getChangePwd = async (req, res) => {
  try {
    res.render("change-password");
  } catch (error) {
    res.redirect("/pageNotFound");
  }
};

const varifyChangePswd = async (req, res) => {
  try {
    const { email } = req.body;
   
    const findUser = await User.findOne({ email: email });
   

    if (findUser) {
      const otp = generateOtp();
     
      const emailSent = await sendVarificationEmail(email, otp);
      if (emailSent) {
        req.session.userOtp = otp;
        req.session.email = email;
        req.session.userData = req.body;
        res.render("change-pswd-otp");
       
      } else {
        res.json({ message: "please try again later" });
      }
    } else {
      res.render("change-password", {
        message: "UserWith this email doennot exist",
      });
    }
  } catch (error) {
    console.log(error);
    res.redirect("/pageNotFound");
  }
};

const varifyPswdOtp = async (req, res, next) => {
  try {
    const enteredOtp = req.body.otp;
    const sessionOtp = req.session.userOtp;


    if (enteredOtp === sessionOtp) {
      req.session.userOtp = null;

      res.json({ success: true, redirectUrl: "/resetPassword" });
    } else {
      res.json({ success: false, message: "OTP not matching" });
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  loadForgotPassword,
  forgotPassword,
  forgotPassVarifyOtp,
  getResetPassPage,
  resendForgotPass,
  resetPassword,
  userProfile,
  editUserProfile,
  deleteProfileImage,
  getChangeEmail,
  varifyChangeEmail,
  varifyEmailOtp,
  updateEmail,
  getChangePwd,
  varifyChangePswd,
  varifyPswdOtp,
};
