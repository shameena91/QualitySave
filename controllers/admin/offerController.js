const Category = require("../../models/categorySchema")
const Product = require("../../models/productSchema")
const Offer=require("../../models/offerSchema")

const getOffer=async(req,res)=>{
    try {
        const products=await Product.find()
          .collation({ locale: 'en', strength: 2 }) 
        .sort({productName:1})
        .lean()
        const category=await Category.find().lean()
        const offer=await Offer.find() 
        .populate('products', 'productName')   
      .populate('category', 'name') 
      .sort({createdAt:-1}) 
      .lean();
        res.render("offer",{products,category,offer})
    } catch (error) {
        
    }
}
const productOffer=async(req,res)=>{
     try {
    const { products, name, code, discount, validUntil, type } = req.body;
    console.log("name",req.body)
    const errors = {};

    if (!Array.isArray(products) || products.length === 0) {
      errors.products = 'Please select at least one product.';
    }

 
    if (!name ) {
      errors.name = 'Offer name is required.';
    }

    if (!code || code.trim() === '') {
      errors.code = 'Offer code is required.';
    }

    if (!discount) {
      errors.discount = 'Discount is required.';
    } else if (discount <= 0 || discount >= 100) {
      errors.discount = 'Discount must be between 1 and 99.';
    }

    if (!validUntil) {
      errors.validUntil = 'Valid until date is required.';
    } else if (new Date(validUntil) <= new Date()) {
      errors.validUntil = 'Valid until date must be in the future.';
    }

    if (!type || type !== 'product') {
      errors.type = 'Invalid offer type.';
    }
console.log(errors)
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    const existingOffer = await Offer.findOne({ code });
    if (existingOffer) {
      return res.status(400).json({
        success: false,
        errors: {
          code: 'Offer code already exists. Please choose another.',
        },
      });
    }

    const newOffer = new Offer({
      offerName: name,
      code,
      discount,
      validUntil,
      type,
      products, 
    });

    await newOffer.save();

  const matchedProducts = await Product.find({ _id: { $in: products } })
  .populate("category")
  
  .lean();
  console.log("mmmm",matchedProducts)
  if(!matchedProducts)
  {
    return res.status(404).json({ status: false, message: "Product not found" });

  }
 for (const product of matchedProducts) {
  const categoryOffer = product.category?.categoryoffer || 0;
  const productOffer = parseInt(discount) || 0;

  const bestOffer = Math.max(categoryOffer, productOffer);
  const discountedPrice = product.salePrice - Math.floor(product.salePrice * (bestOffer / 100));

  await Product.findByIdAndUpdate(product._id, { discountedPrice ,productOffer:discount});
}


   


    return res.json({ success: true });
  } catch (error) {
    console.error('Error creating product offer:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const categoryOffer = async (req, res) => {
  try {
    const { name, code, discount, validUntil, type, categoryId } = req.body;
    const errors = {};

  
    if (!name) errors.name = 'Offer name is required.';
    if (!code) errors.code = 'Offer code is required.';
    if (!discount) {
      errors.discount = 'Discount is required.';
    } else if (discount <= 0 || discount >= 100) {
      errors.discount = 'Discount must be between 1 and 99.';
    }
    if (!validUntil) {
      errors.validUntil = 'Valid until date is required.';
    } else if (new Date(validUntil) <= new Date()) {
      errors.validUntil = 'Valid until date must be in the future.';
    }
    if (!type || type !== 'category') {
      errors.type = 'Invalid offer type. Must be "category".';
    }
    if (!categoryId) {
      errors.categoryId = 'Category must be selected.';
    }


    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    const existingOffer = await Offer.findOne({ code });
    if (existingOffer) {
      return res.status(400).json({
        success: false,
        errors: {
          code: 'Offer code already exists. Please choose another.'
        }
      });
    }


    const newOffer = new Offer({
      offerName: name,
      code,
      discount,
      validUntil,
      type,
      category: categoryId,
    });

    await newOffer.save();


    const findCategory = await Category.findById(categoryId);
    if (findCategory) {
      findCategory.categoryoffer = discount;
      await findCategory.save();
    }

   
    const products = await Product.find({ category: categoryId }).populate('category').lean();

    if (!products.length) {
      return res.status(404).json({ success: false, message: "No products found for this category." });
    }

    for (const product of products) {
      const productOffer = product.productOffer || 0;
      const categoryOffer = parseInt(discount);

      const bestOffer = Math.max(productOffer, categoryOffer);
      const discountedPrice = product.salePrice - Math.floor(product.salePrice * (bestOffer / 100));

      await Product.findByIdAndUpdate(product._id, {
        discountedPrice,
      });
    }

    return res.json({ success: true, message: "Category offer created and applied to products." });

  } catch (error) {
    console.error('Error creating category offer:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};
const deleteOffer = async (req, res) => {
  try {
    const { offerId } = req.params;
    console.log("offerId",offerId)

    const offer = await Offer.findById(offerId);
    if (!offer) {
      return res.status(404).json({ success: false, message: 'Offer not found.' });
    }

 
    const { type, products, category, discount } = offer;

    if (type === 'product') {
     
      for (const productId of products) {
        const product = await Product.findById(productId);
        if (!product) continue;

   
        const categoryOffer = product.category?.categoryoffer || 0;
        const discountedPrice = categoryOffer
          ? product.salePrice - Math.floor(product.salePrice * (categoryOffer / 100))
          : product.salePrice;

        await Product.findByIdAndUpdate(productId, {
          productOffer: 0,
          discountedPrice,
        });
      }
    }

    if (type === 'category') {
     
      const findCategory = await Category.findById(category);
      if (findCategory) {
        findCategory.categoryoffer = 0;
        await findCategory.save();
      }

   
      const categoryProducts = await Product.find({ category });

      for (const product of categoryProducts) {
        const productOffer = product.productOffer || 0;
        const bestOffer = productOffer;
        const discountedPrice = bestOffer
          ? product.salePrice - Math.floor(product.salePrice * (bestOffer / 100))
          : product.salePrice;

        await Product.findByIdAndUpdate(product._id, {
          discountedPrice,
        });
      }
    }

   
    await Offer.findByIdAndDelete(offerId);

    res.json({ success: true, message: 'Offer deleted and related updates completed.' });

  } catch (error) {
    console.error('Error deleting offer:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};


module.exports={
    getOffer,
    productOffer,
    categoryOffer,
    deleteOffer
}