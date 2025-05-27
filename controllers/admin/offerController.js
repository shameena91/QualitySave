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
        .populate('products', 'productName')   // only show productName
      .populate('category', 'name')  // only show categoryName
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

    // Validate products (should be an array with at least one product ID)
    if (!Array.isArray(products) || products.length === 0) {
      errors.products = 'Please select at least one product.';
    }

    // Validate name
    if (!name ) {
      errors.name = 'Offer name is required.';
    }

    // Validate code
    if (!code || code.trim() === '') {
      errors.code = 'Offer code is required.';
    }

    // Validate discount
    if (!discount) {
      errors.discount = 'Discount is required.';
    } else if (discount <= 0 || discount >= 100) {
      errors.discount = 'Discount must be between 1 and 99.';
    }

    // Validate validUntil date
    if (!validUntil) {
      errors.validUntil = 'Valid until date is required.';
    } else if (new Date(validUntil) <= new Date()) {
      errors.validUntil = 'Valid until date must be in the future.';
    }

    // Validate type
    if (!type || type !== 'product') {
      errors.type = 'Invalid offer type.';
    }
console.log(errors)
    // If any validation errors, return 400 with errors object
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    // Check for duplicate offer code
    const existingOffer = await Offer.findOne({ code });
    if (existingOffer) {
      return res.status(400).json({
        success: false,
        errors: {
          code: 'Offer code already exists. Please choose another.',
        },
      });
    }

    // Create new offer
    const newOffer = new Offer({
      offerName: name,
      code,
      discount,
      validUntil,
      type,
      products, // array of product IDs
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

  // Update each product in DB by ID
  await Product.findByIdAndUpdate(product._id, { discountedPrice ,productOffer:discount});
}


    // Optional: you can update the individual products if needed
    // e.g. add this offer's discount to each product, or flag the offer

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

    // === VALIDATIONS ===
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

    // Return validation errors
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    // === CHECK FOR EXISTING OFFER CODE ===
    const existingOffer = await Offer.findOne({ code });
    if (existingOffer) {
      return res.status(400).json({
        success: false,
        errors: {
          code: 'Offer code already exists. Please choose another.'
        }
      });
    }

    // === SAVE OFFER ===
    const newOffer = new Offer({
      offerName: name,
      code,
      discount,
      validUntil,
      type,
      category: categoryId,
    });

    await newOffer.save();

    // === UPDATE CATEGORY OFFER FIELD ===
    const findCategory = await Category.findById(categoryId);
    if (findCategory) {
      findCategory.categoryoffer = discount;
      await findCategory.save();
    }

    // === APPLY TO PRODUCTS ===
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

    // Destructure for clarity
    const { type, products, category, discount } = offer;

    if (type === 'product') {
      // Reset discountedPrice for all products in the offer
      for (const productId of products) {
        const product = await Product.findById(productId);
        if (!product) continue;

        // Recalculate best discount (only category remains if any)
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
      // Clear offer in the category
      const findCategory = await Category.findById(category);
      if (findCategory) {
        findCategory.categoryoffer = 0;
        await findCategory.save();
      }

      // Reset all products in the category
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

    // You can add similar logic for referral offers if needed

    // Finally, delete the offer
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