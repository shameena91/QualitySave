 const Product=require("../../models/productSchema")
 const Category=require("../../models/categorySchema")
 const Brand=require("../../models/brandSchema")
 const User=require("../../models/userSchema")
 const fs=require("fs")
 const path=require("path")
 const sharp=require("sharp")
 
const productList = async (req, res) => {
  try {
    const search = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
 
    const searchExp = new RegExp(search.trim(), "i"); 
    const brandIds = await Brand.find({ brandName: { $regex: searchExp } }).distinct("_id");
    const categoryIds = await Category.find({ name: { $regex: searchExp } }).distinct("_id");
    console.log("cat:",categoryIds)

    const productData = await Product.find({
      $or: [
        { productName: { $regex: searchExp } },
        { brand: { $in: brandIds } },
        { category: { $in: categoryIds } }
      ],
    })
      .populate("brand")
      .limit(limit)
      .skip((page - 1) * limit)
      .sort({createdAt:-1})
      .populate("category")
      
      .lean()
      .exec();
      console.log("Search term:", search);  // Log the search term
      console.log("Sample Product Data:", productData); 
    const countProduct = await Product.countDocuments({
      $or: [
        { productName: { $regex: searchExp } },
        { brand: { $in: brandIds } },
        { category: { $in: categoryIds } }  
      ],
    });

    const totalPages = Math.ceil(countProduct / limit);

    const category = await Category.find({ isListed: true });
    const brand = await Brand.find({ isBlocked: false });

    // productData.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt))
   

    if (category && brand) {
      res.render("productList", {
        data: productData,
        currentPage: page,
        totalPages: totalPages,
        cat: category,
        brand: brand,
      });
    } else {
      res.render("page-404");
    }
  } catch (error) {
    console.error("Error rendering product list:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const addProduct= async (req, res) => {
    try {
        const category=await Category.find({isListed:true}).lean()
        const brand=await Brand.find({isBlocked:false}).lean()
        console.log(category)
        return res.render("addProduct",{
            cat:category,
            brand:brand,
        });
    } catch (error) {
        console.error("Error rendering product list:", error);
        res.status(500).json({ error: "Internal server error" });  // Optional: Send a response on error
    }
};


const postProducts = async (req, res) => {
  // uploads(req, res, async (err) => {
  //   if (err) {
  //     return res.status(500).json({ message: 'Error uploading files' });
  //   }

    try {
      const products = req.body;
      console.log(products);

      const productExist = await Product.findOne({ productName: products.productName });
      if (productExist) {
        return res.status(400).json({ message: 'Product already exists' });
      }
      console.log("Files received:", req.files.length);
      console.log(req.files);
      const images = [];
      if (req.files && req.files.length > 0) {
        for (let i = 0; i < req.files.length; i++) {
          const originalImagePath = req.files[i].path;
          const resizedImagePath = path.join(
            'public', 'uploads', 'product-images',
            req.files[i].filename
          );

          // Resize image to 440x440
          await sharp(originalImagePath)
            .resize({ width: 440, height: 440 })
            .toFile(resizedImagePath);

          images.push(req.files[i].filename); // Add image filename to the array
        }
      }

      const categoryDoc = await Category.findOne({ _id: products.category });
      if (!categoryDoc) {
        return res.status(400).json({ message: 'Invalid category' });
      }
    

      const newProduct = new Product({
        productName: products.productName,
        description: products.descriptionData,
        brand: products.brand,
        category: categoryDoc._id,
        regularPrice: products.regularPrice,
        salePrice: products.salePrice,
        quantity: products.quantity,
       
        createdAt: new Date(),
        productImage: images, 
        status: 'Available'
      });
      console.log("jjjjjjj",categoryDoc.categoryoffer)
console.log(newProduct)
     if (!newProduct.productOffer && categoryDoc.categoryoffer) {
    
      // Optionally update discountedPrice here based on offer:
      newProduct.discountedPrice = 
        newProduct.salePrice - Math.floor(newProduct.salePrice * (categoryDoc.categoryoffer / 100));
    }
      await newProduct.save();
      res.status(200).json({ message: 'Product added successfully' });

    } catch (error) {
      console.error('Error while adding product:', error);
      res.status(500).json({ message: 'Server error' });
    }
 
};

const addProductOffer = async (req, res) => {
    try {
      const { productId, percentage } = req.body;
  
      const findProduct = await Product.findOne({ _id: productId });
      if (!findProduct) {
        return res.json({ status: false, message: "Product not found" });
      }
  
      const findCategory = await Category.findOne({ _id: findProduct.category });
      console.log("nnnnnnnnnnn",findCategory)

  if(percentage>findCategory.categoryoffer)

  {
   
      findProduct.discountedPrice =
        findProduct.salePrice - Math.floor(findProduct.salePrice * (percentage / 100));
      findProduct.productOffer = parseInt(percentage);
      
      //    console.log( findProduct.discountedPrice)
  }else{
    findProduct.productOffer = parseInt(percentage);
    //  findProduct.discountedPrice =
    //     findProduct.salePrice - Math.floor(findProduct.salePrice * (findCategory.productOffer / 100));
    //   findProduct.productOffer = parseInt(findCategory.categoryoffer);
    //   console.log( findProduct.discountedPrice)

  }
     
  await findProduct.save();
  
      return res.json({ status: true });
    } catch (error) {
      console.error("Error in addProductOffer:", error);
      return res.status(500).json({ status: false, message: "Internal server error" });
    }
  };
  

const removeProductOffer=async(req,res)=>{
    try {
        const {productId}=req.body
        const findProduct=await Product.findOne({_id:productId})
        
      const findCategory = await Category.findOne({ _id: findProduct.category });
      console.log("nnnnnnnnnnn",findCategory)
        const percentage=findProduct.productOffer

    if (percentage > findCategory.categoryoffer) {
      // Remove product offer, reset discountedPrice to salePrice
      findProduct.discountedPrice = findProduct.salePrice;
      findProduct.productOffer = 0;

      // If category offer exists, apply category offer discount
      if (findCategory.categoryoffer && findCategory.categoryoffer !== 0) {
        findProduct.discountedPrice =
          findProduct.salePrice - Math.floor(findProduct.salePrice * (findCategory.categoryoffer / 100));
      }
    } else {
      // If product offer is less or equal to category offer, just reset productOffer to 0
      findProduct.productOffer = 0;
      // Optional: you might want to reset discountedPrice here as well
      findProduct.discountedPrice = findProduct.salePrice;
    }


        await findProduct.save()
        res.json({status:true})
    }catch(error)
    {
        res.redirect("/pageerrror")
    }
}


const blockProduct=async(req,res)=>{
    try {
        let id=req.query.id;
        await Product.updateOne({_id:id},{$set:{isBlocked:true}})
        res.redirect("/admin/productList")
    } catch (error) {
        res.redirect("/pageerror")
    }
}
const unblockProduct=async(req,res)=>{
    try {
        let id=req.query.id;
        await Product.updateOne({_id:id},{$set:{isBlocked:false}})
        res.redirect("/admin/productList")
    } catch (error) {
        res.redirect("/pageerror")
    }
}


const geteditProduct= async(req,res)=>{
    try {

        const id=req.params.id
        const product=await Product.findOne({_id:id}).lean()
        const brand=await Brand.find({}).lean()
        const category= await Category.find().lean()
        console.log("edite",product)
        console.log(brand)
        console.log("dddddddddddddd",product)
        
        res.render("editProduct",{
            product:product,
        cat:category,
    brand:brand}
)
    } catch (error) {
        res.redirect("/pageerror")
        
    }
}
const editProduct = async (req, res) => {
  try {
    const id = req.params.id;
    const data = req.body;
    console.log("update data", data);

    const existingProduct = await Product.findOne({
      productName: data.productName.trim(),  
      _id: { $ne: id }
    });

    if (existingProduct) {
      return res.status(400).json({ error: "Product with same name exists" });
    }

    const images = [];

    if (req.files && req.files.length > 0) {
      for (let i = 0; i < req.files.length; i++) {
        const originalImagePath = req.files[i].path;
        const resizedImagePath = path.join(
          'public', 'uploads', 'product-images',
          req.files[i].filename
        );

    
        await sharp(originalImagePath)
          .resize({ width: 440, height: 440 })
          .toFile(resizedImagePath);

        images.push(req.files[i].filename); 
      }
    }
   

  
    const updateFields = {
      productName: data.productName,
      description: data.descriptionData,
      brand: data.brand,
      category: data.category,
      regularPrice: data.regularPrice,
      salePrice: data.salePrice,
      quantity: data.quantity,
    };

  
    if (images.length > 0) {
      await Product.findByIdAndUpdate(id, {
        $set: updateFields,
        $push: { productImage: { $each: images } }, 
      }, { new: true });
    } else {
      await Product.findByIdAndUpdate(id, {
        $set: updateFields
      }, { new: true });
    }

    res.json({
      status: 'success',
      message: 'Product updated successfully!',
      redirectUrl: '/admin/productList'
    });

  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ error: "An error occurred while updating the product" });
  }
};


const deleteSingleImage = async (req, res) => {
  try {
    const { imageNameToServer, productIdToServer } = req.body;
    console.log(productIdToServer)


    const product = await Product.findByIdAndUpdate(
      productIdToServer,
      { $pull: { productImage: imageNameToServer } }
    );

    if (!product) {
      return res.status(404).send({ status: false, message: "Product not found" });
    }

    const imagePath = path.join("public", "uploads", "product-images", imageNameToServer);


    if (fs.existsSync(imagePath)) {
  
      await fs.promises.unlink(imagePath);
      console.log(`Image ${imageNameToServer} deleted successfully.`);
      res.send({ status: true, message: 'Image deleted successfully' });
    } else {
      console.log(`Image ${imageNameToServer} not found.`);
      res.send({ status: false, message: 'Image not found on server' });
    }
  } catch (error) {
    console.error("Error deleting image:", error);
    res.status(500).send({ status: false, message: 'Error deleting image' });
  }
};


const deleteProduct= async(req,res)=>{
  try {
    const id=req.params.id;
    if(!id){
        return res.status(404).redirect("/pageerror")
    }
    await Product.deleteOne({_id:id})
    res.status(200).json({message:"successfully deleted"})
} catch (error) {
    console.log(error)
    res.status(500).json({error:"internal server Error"})
}
}
module.exports = { productList,addProduct,postProducts,
    addProductOffer,removeProductOffer,
    unblockProduct,
    blockProduct,
    geteditProduct,editProduct ,deleteSingleImage,deleteProduct};
