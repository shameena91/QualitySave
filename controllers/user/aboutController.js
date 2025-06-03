const getPrivacy=async(req,res)=>{
    try {
        res.render("privacy",{ effectiveDate: 'June 3, 2025' })
    } catch (error) {
        
    }
}
const getTermsConditions=async(req,res)=>{
    try {
        res.render("terms")
    } catch (error) {
        
    }
}
const getAboutUs=async(req,res)=>{
    try {
        res.render("aboutUs")
    } catch (error) {
        
    }
}
module.exports={getPrivacy,
    getTermsConditions,
    getAboutUs
}