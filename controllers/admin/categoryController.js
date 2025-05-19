
const { response } = require("express");
const Category =require("../../models/categorySchema")
const loadCategory= async(req,res)=>{
    try {
        const search=req.query.search || "";
        const page=parseInt(req.query.page)||1
        const limit=8;
        const skip=(page-1)*limit

       console.log("cat searc",search)
        const searchExp= new RegExp(search.trim(),"i")
        const categoryData=await Category.find({
            
                name:{$regex:searchExp},   
        })
        .sort({createdAt:-1})
        .skip(skip)
        .limit(limit)
        .lean();

      console.log("catdata0",categoryData)

        const totalCategories=await Category.countDocuments(
            {
                
                    name:{$regex:searchExp},
                  
            }
        )
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
        const existingCategory =await Category.findOne({name: { $regex: new RegExp("^" + name + "$", "i") }})
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

        const id=req.params.id
        const category= await Category.findOne({_id:id}).lean()
        
        res.render("editCategory",{category})
    } catch (error) {
        res.redirect("/pageerror")
        
    }
}

const updateCategory=async(req,res)=>{
    try {

         const id=req.params.id
        
         const{name,description,offerprice}=req.body
        
        const isExistCategory= await Category.findOne({
            name: { $regex: new RegExp("^" + name + "$", "i") },
            _id: { $ne: id } }).lean();
       
        if(isExistCategory)
        {
            return res.status(400).json({error:"category exists.please choose another one" })
        }
        const updateCategory= await Category.findByIdAndUpdate(id,{
         
            name:name,
            description:description,
            categoryoffer:offerprice
        },{new:true})

       
        if(updateCategory)
        {
            return res.status(200).json({message:"Category updated Successfully"})
        }else{
            res.status(400).json({error:"Category not found"})
        }

    } catch (error) {
        console.log(error)
        res.status(500).json({error:"internal server Error"})
    }
}

const deleteCategory=async(req,res)=>{
    try {
        const id=req.params.id;
        if(!id){
            return res.status(404).redirect("/pageerror")
        }
        await Category.deleteOne({_id:id})

        return res.status(200).json({message:"Category deleted Successfully"})
     
    } catch (error) {
        console.log(error)
        res.status(500).json({error:"internal server Error"})
    }
}

const addCategoryOffer=async(req,res,next)=>{
    try {
              const { categoryId, percentage } = req.body;
              const findCategory=await Category.findById({_id:categoryId})
            if(!findCategory)
            {
                return res.json({ status: false, message: "Category not found" });
            }
            findCategory.categoryoffer=percentage
            await findCategory.save();
              return res.json({ status: true });
    } catch (error) {
        next(error)
    }
}

const removeCategoryOffer=async(req,res)=>{
    try {
        const {categoryId}=req.body
        const findCategory=await Category.findOne({_id:categoryId})
        findCategory.categoryoffer=0
        await findCategory.save()
        res.json({status:true})
    }catch(error)
    {
        res.redirect("/pageerrror")
    }
}


module.exports={loadCategory,
    addCategory,
    categoryListed,
    categoryunListed,
    editCategory,
    updateCategory,deleteCategory,
addCategoryOffer,
removeCategoryOffer
}