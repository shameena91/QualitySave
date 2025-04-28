
const User=require('../../models/userSchema');
const mongoose=require('mongoose')
const bcrypt=require('bcrypt')
const pageError=async(req,res)=>{
    res.render("admin-error")
}

const loadLogin= (req,res)=>{
    if(req.session.admin)
    {
       
        return res.redirect("/admin/dashboard")
    }
    console.log("loginpage")
    res.render("admin-login",{message:null})
}

const login= async (req,res)=>{
    try {
        console.log("login reached")
        const {email,password}=req.body;
        console.log(email)
        console.log(password)
       

        const admin=await User.findOne({email:email,isAdmin:true})
        console.log(admin)
        if(admin){
            const passwordmatch=await bcrypt.compare(password,admin.password)
            if(passwordmatch)
            {
                req.session.admin=true
                console.log("succedd")
                return res.redirect('/admin/dashboard')
            }else{
                console.log("error")
                return redirect("/admin-login")
            }
        }
    } catch (error) {
        console.log("login failed",error);
        return res.redirect("/pageerror")
        
        
    }
}

const loadDashboard= async(req,res)=>{
    if(req.session.admin)
        {
            try{
                return res.render("dashboard")
            }catch(error)
            {
                res.redirect("/pageerror")
            }
           
        }


}

const adminlogout=async(req,res)=>{
    try {
        req.session.destroy(err=>{
            if(err)
            {
                console.log("Error occured destroying session",err);
                return res.redirect("/pageerror")
            }
            res.redirect('/admin/login')
        })
    } catch (error) {
        console.log("unexpected error during logout");
        res.redirect("/pageerror")
    }

}

module.exports={loadLogin,
    login,
    loadDashboard,
    pageError,
    adminlogout}