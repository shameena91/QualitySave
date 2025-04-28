
const { response } = require("express");
const Category =require("../../models/categorySchema")
const loadCategory= async(req,res)=>{
    try {
        const page=parseInt(req.query.page)||1
        const limit=4;
        const skip=(page-1)*limit

        const categoryData=await Category.find({})
        .sort({createsAt:-1})
        .skip(skip)
        .limit(limit)
        .lean();

        const totalCategories=await Category.countDocuments()
        const totalPages=Math.ceil(totalCategories/limit)
        res.render("categoryList",{cat:categoryData,
            currentPage:page,
            totalCategories:totalCategories,
            totalPages:totalPages
        })
    } catch (error) {
        console.error(error)
        res.redirect("/pageerror")
    }
}


const addCategory= async(req,res)=>{
    console.log("bodt",req.body)
    if (!req.body) {
        return res.status(400).json({ error: "No data received" });
    }
    const{name,description,offerprice}=req.body
    // 
    try {
        const existingCategory =await Category.findOne({name})
        if(existingCategory)
        {
            return res.status(400).json({error:"category already Exista"})
        }
        const newCategory=new Category({
            name,
            description,
            categoryoffer:offerprice
        })
        await newCategory.save();
        // res.redirect("/admin/dashboard");
        return res.status(200).json({message:"Category added Successfully"})
        
    } catch (error) {
        return res.status(500).json({error:"Internal server error"})
    }
}

const categoryListed=async(req,res)=>{
    try {
        let id=req.query.id;
        await Category.updateOne({_id:id},{$set:{isListed:true}})
        res.redirect("/admin/category")
    } catch (error) {
        res.redirect("/pageerror")
    }
}
const categoryunListed=async(req,res)=>{
    try {
        let id=req.query.id;
        await Category.updateOne({_id:id},{$set:{isListed:false}})
        res.redirect("/admin/category")
    } catch (error) {
        res.redirect("/pageerror")
    }
}
const editCategory= async(req,res)=>{
    try {

        const id=req.query.id
        const category= await Category.findOne({_id:id}).lean()
        
        res.render("editCategory",{category})
    } catch (error) {
        res.redirect("/pageerror")
        
    }
}

const updateCategory=async(req,res)=>{
    try {

         const id=req.query.id
         console.log("id is:",id)
         const{name,description,offerprice}=req.body
         console.log(offerprice)
        const isExistCategory= await Category.findOne({ name: name, _id: { $ne: id } }).lean();
       
        if(isExistCategory)
        {
            return res.status(400).json({error:"category exists.please choowse another one" })
        }
        const updateCategory= await Category.findByIdAndUpdate(id,{
         
            name:name,
            description:description,
            categoryoffer:offerprice
        },{new:true})

       
        if(updateCategory)
        {
            res.redirect("/admin/category")
        }else{
            res.status(400).json({error:"Category not found"})
        }

    } catch (error) {
        console.log(error)
        res.status(500).json({error:"internal server Error"})
    }
}



//  const deleteCategory= async(req,res)=>{
    
//  }


module.exports={loadCategory,
    addCategory,
    categoryListed,
    categoryunListed,
    editCategory,
    updateCategory}