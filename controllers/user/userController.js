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
        console.log("Home controller reached ✅");
        return res.render('userHome')

    }catch(error)
    {
console.log("Home page not found")
res.status(500).send("server error")
    }
}


module.exports={loadHomePage,pageNotFound}