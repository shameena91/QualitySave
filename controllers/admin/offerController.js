const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");
const Offer = require("../../models/offerSchema");

const updateOfferStatuses = async () => {
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);

  // 1. Update offer status based on validUntil
  await Offer.updateMany(
    { validUntil: { $lt: todayDate }, status: "Active" },
    { $set: { status: "Inactive" } }
  );

  await Offer.updateMany(
    { validUntil: { $gte: todayDate }, status: "Inactive" },
    { $set: { status: "Active" } }
  );

  // 2. Recalculate discounted prices
  const products = await Product.find().populate("category");

  for (const product of products) {
    // Check for active product offer
    const productOfferDoc = await Offer.findOne({
      type: "product",
      products: product._id,
      status: "Active",
    });

    const productOffer = productOfferDoc?.discount || 0;

    // Check for active category offer
    const categoryOfferDoc = await Offer.findOne({
      type: "category",
      category: product.category?._id,
      status: "Active",
    });

    const categoryOffer = categoryOfferDoc?.discount || 0;

    // Apply the best offer
    const bestOffer = Math.max(productOffer, categoryOffer);

    const discountedPrice =
      bestOffer > 0
        ? product.salePrice - Math.floor(product.salePrice * (bestOffer / 100))
        : product.salePrice;

    await Product.findByIdAndUpdate(product._id, {
      discountedPrice,
      // productOffer: productOffer, // category offer doesn't go in this field
    });
  }

  console.log(" Offer statuses and product prices updated.");
};

const getCommonData = async () => {
  const products = await Product.find()
    .collation({ locale: "en", strength: 2 })
    .sort({ productName: 1 })
    .lean();

  const category = await Category.find().lean();

  const offer = await Offer.find()
    .populate("products", "productName")
    .populate("category", "name")
    .sort({ createdAt: -1 })
    .lean();

  return { products, category, offer };
};

const getProductOffer = async (req, res) => {
  try {
    await updateOfferStatuses(); // Keep this at the top

    const search = req.query.search || "";
    const statusFilter = req.query.statusFilter;
    const currentPage = parseInt(req.query.page) || 1;
    const itemsPerPage = 10;
    const skip = (currentPage - 1) * itemsPerPage;

    const searchExp = new RegExp(search.trim(), "i");
    const matchingOfferIds = await Offer.find({ code: { $regex: searchExp} ,type:"product" }).distinct("_id");
console.log("hhhhhhhhhhh",statusFilter)
console.log("hhhhhhhhhhh",search)
    const query = {
      _id: { $in: matchingOfferIds }
    };

    if (statusFilter) {
      query.status = statusFilter;
    }

    const totalOffers = await Offer.countDocuments(query);
    const offer = await Offer.find(query)
      .populate("products", "productName")
      .populate("category", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(itemsPerPage)
      .lean();

    const { products, category } = await getCommonData();

    res.render("productOffer", {
      products,
      category,
      offer,
      search,
      statusFilter,
      currentPage,
      totalPages: Math.ceil(totalOffers / itemsPerPage),
    });

  } catch (error) {
    console.error("Error in getProductOffer:", error);
    res.status(500).send("Server Error");
  }
};


const getCategoryOffer = async (req, res) => {
  try {
    await updateOfferStatuses();

const search = req.query.search || "";
    const statusFilter = req.query.statusFilter;
    const currentPage = parseInt(req.query.page) || 1;
    const itemsPerPage = 10;
    const skip = (currentPage - 1) * itemsPerPage;
   const searchExp = new RegExp(search.trim(), "i");

   const matchingOfferIds = await Offer.find({ code: { $regex: searchExp },type:"category" }).distinct("_id");
console.log("hhhhhhhhhhh",statusFilter)
console.log("hhhhhhhhhhh",search)
    const query = {
      _id: { $in: matchingOfferIds }
    };

    if (statusFilter) {
      query.status = statusFilter;
    }

     const totalOffers = await Offer.countDocuments(query);
    const offer = await Offer.find(query)
      .populate("products", "productName")
      .populate("category", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(itemsPerPage)
      .lean();
    const { products, category } = await getCommonData();

    res.render("categoryOffer", {  products,
      category,
      offer,
      search,
      statusFilter,
      currentPage,
      totalPages: Math.ceil(totalOffers / itemsPerPage), });
  } catch (error) {
    console.error("Error in getCategoryOffer:", error);
    res.status(500).send("Server Error");
  }
};

const productOffer = async (req, res) => {
  try {
    const { products, name, code, discount, validUntil, type } = req.body;
    const errors = {};

    console.log(products);

    if (!Array.isArray(products) || products.length === 0) {
      errors.products = "Please select at least one product.";
    }

    if (!name || name.trim() === "") {
      errors.name = "Offer name is required.";
    }

    if (!code || code.trim() === "") {
      errors.code = "Offer code is required.";
    }

    if (!discount) {
      errors.discount = "Discount is required.";
    } else if (discount <= 0 || discount >= 100) {
      errors.discount = "Discount must be between 1 and 99.";
    }

    if (!validUntil) {
      errors.validUntil = "Valid until date is required.";
    } else if (new Date(validUntil) <= new Date()) {
      errors.validUntil = "Valid until date must be in the future.";
    }

    if (type !== "product") {
      errors.type = "Invalid offer type.";
    }

    // If validation errors exist, return 400
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    // ==== Duplicate Code Check ====
    const existingOffer = await Offer.findOne({ code });
    if (existingOffer) {
      return res.status(400).json({
        success: false,
        errors: {
          code: "Offer code already exists. Please choose another.",
        },
      });
    }

    // ==== Create New Offer ====
    const newOffer = new Offer({
      offerName: name,
      code,
      discount,
      validUntil,
      type,
      products,
    });

    await newOffer.save();

    // ==== Fetch and Update Products ====
    const matchedProducts = await Product.find({ _id: { $in: products } })
      .populate("category")
      .lean();

    if (!matchedProducts.length) {
      return res
        .status(404)
        .json({ success: false, message: "Products not found." });
    }

    for (const product of matchedProducts) {
      const categoryOffer = product.category?.categoryoffer || 0;
      const productOffer = parseInt(discount);
      const bestOffer = Math.max(categoryOffer, productOffer);
      console.log(productOffer);
      const discountedPrice =
        product.salePrice - Math.floor(product.salePrice * (bestOffer / 100));

      await Product.findByIdAndUpdate(product._id, {
        discountedPrice,
        productOffer: productOffer,
      });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error("Error creating product offer:", error);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

const categoryOffer = async (req, res) => {
  try {
    const { name, code, discount, validUntil, type, categoryId } = req.body;
    const errors = {};

    // Validation
    if (!name) errors.name = "Offer name is required.";
    if (!code) errors.code = "Offer code is required.";
    if (!discount) {
      errors.discount = "Discount is required.";
    } else if (discount <= 0 || discount >= 100) {
      errors.discount = "Discount must be between 1 and 99.";
    }
    if (!validUntil) {
      errors.validUntil = "Valid until date is required.";
    } else if (new Date(validUntil) <= new Date()) {
      errors.validUntil = "Valid until date must be in the future.";
    }
    if (type !== "category") {
      errors.type = 'Invalid offer type. Must be "category".';
    }
    if (!categoryId) {
      errors.categoryId = "Category must be selected.";
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    // Check for duplicate offer code
    const existingOffer = await Offer.findOne({ code });
    if (existingOffer) {
      return res.status(400).json({
        success: false,
        errors: {
          code: "Offer code already exists. Please choose another.",
        },
      });
    }

    // Check if category already has an offer
    const existingCategory = await Offer.findOne({ category: categoryId });
    if (existingCategory) {
      return res.status(400).json({
        success: false,
        errors: {
          categoryId: "Offer for this category already exists. Please choose another.",
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
      category: categoryId,
      status: "Active",
    });

    await newOffer.save();

    // Update category
    const findCategory = await Category.findById(categoryId);
    if (findCategory) {
      findCategory.categoryoffer = discount;
      await findCategory.save();
    }

    // Apply offer to all products in that category
    const products = await Product.find({ category: categoryId }).populate("category").lean();

    if (!products.length) {
      return res.status(404).json({
        success: false,
        message: "No products found for this category.",
      });
    }

    for (const product of products) {
      try {
        const productOffer = product.productOffer || 0;
        const categoryOffer = parseInt(discount);
        const bestOffer = Math.max(productOffer, categoryOffer);

        const discountedPrice = product.salePrice - Math.floor(product.salePrice * (bestOffer / 100));

        await Product.findByIdAndUpdate(product._id, {
          discountedPrice,
          categoryOffer: categoryOffer,
        });
      } catch (err) {
        console.error(`Error updating product ${product._id}:`, err.message);
        // You can collect these errors if needed
      }
    }

    return res.status(200).json({
      success: true,
      message: "Category offer created and applied to products.",
    });

  } catch (error) {
    console.error("Error creating category offer:", error);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

const deleteOffer = async (req, res) => {
  try {
    const { offerId } = req.params;
    console.log("offerId", offerId);

    const offer = await Offer.findById(offerId);
    if (!offer) {
      return res
        .status(404)
        .json({ success: false, message: "Offer not found." });
    }

    const { type, products, category, discount } = offer;

    if (type === "product") {
      for (const productId of products) {
        const product = await Product.findById(productId);
        if (!product) continue;

        const categoryOffer = product.category?.categoryoffer || 0;
        const discountedPrice = categoryOffer
          ? product.salePrice -
            Math.floor(product.salePrice * (categoryOffer / 100))
          : product.salePrice;

        await Product.findByIdAndUpdate(productId, {
          productOffer: 0,
          discountedPrice,
        });
      }
    }

    if (type === "category") {
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
          ? product.salePrice -
            Math.floor(product.salePrice * (bestOffer / 100))
          : product.salePrice;

        await Product.findByIdAndUpdate(product._id, {
          discountedPrice,
        });
      }
    }

    await Offer.findByIdAndDelete(offerId);

    res.json({
      success: true,
      message: "Offer deleted and related updates completed.",
    });
  } catch (error) {
    console.error("Error deleting offer:", error);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

function bestOffer(categoryOffer, productOffer, salePrice) {
  const best = Math.max(categoryOffer, productOffer);
  return salePrice - Math.floor(salePrice * (best / 100));
}

const editProductOffer = async (req, res) => {
  try {
    const { offerId, offerName, discount, validUntil, products, type } =
      req.body;
    let parsed;
    if (validUntil.includes("/")) {
      const [day, month, year] = validUntil.split("/");
      parsed = new Date(`${year}-${month}-${day}`);
    } else {
      parsed = new Date(validUntil);
    }
    const originalOffer = await Offer.findById(offerId);
    const oldProductIds = originalOffer.products.map((id) => id.toString());
    const newProductIds = products.map((id) => id.toString());
    const updatedOffer = await Offer.findByIdAndUpdate(
      offerId,
      {
        offerName,
        discount,
        validUntil: parsed,
        products,
        updatedAt: new Date(),
      },
      { new: true }
    );
    if (!updatedOffer) {
      return res
        .status(404)
        .json({ success: false, message: "Offer not found." });
    }
    // STEP 3: Get products that still belong to this offer
    const matchedProducts = await Product.find({ _id: { $in: products } })
      .populate("category")
      .lean();

    if (!matchedProducts.length) {
      return res
        .status(404)
        .json({ success: false, message: "Products not found." });
    }

    for (const product of matchedProducts) {
      const categoryOffer = product.category?.categoryoffer || 0;
      const productOffer = parseInt(discount);
      const discountedPrice = bestOffer(
        categoryOffer,
        productOffer,
        product.salePrice
      );
      await Product.findByIdAndUpdate(product._id, {
        discountedPrice,
        productOffer: productOffer,
      });
    }
    // STEP 4: Find and reset removed products
    const removedProductIds = oldProductIds.filter(
      (id) => !newProductIds.includes(id)
    );

    const removedProducts = await Product.find({
      _id: { $in: removedProductIds },
    }).populate("category");

    for (const product of removedProducts) {
      const categoryOffer = product.category?.categoryoffer || 0;

      const discountedPrice =
        product.salePrice -
        Math.floor(product.salePrice * (categoryOffer / 100));

      await Product.findByIdAndUpdate(product._id, {
        discountedPrice,
        productOffer: 0,
      });
    }
    res.status(200).json({
      success: true,
      message: "Product offer updated successfully!",
      offer: updatedOffer,
    });
  } catch (error) {
    console.error("Edit product offer error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error. Please try again." });
  }
};

const editCategoryOffer = async (req, res) => {
  try {
    const { offerId, offerName, discount, validUntil, categoryId, type } =
      req.body;
    console.log(offerId, offerName, discount, validUntil, categoryId, type);

    const updatedOffer = await Offer.findByIdAndUpdate(
      offerId,
      {
        offerName,
        discount,
        validUntil,
        categoryId,
        updatedAt: new Date(),
      },
      { new: true }
    );
    if (!updatedOffer) {
      return res
        .status(404)
        .json({ success: false, message: "Offer not found." });
    }
    const findCategory = await Category.findById(categoryId);
    if (findCategory) {
      findCategory.categoryoffer = discount;
      await findCategory.save();
    }

    const products = await Product.find({ categoryId: categoryId });

    for (const product of products) {
      const categoryOffer = parseInt(discount);
      const productOffer = product.productOffer;
      const discountedPrice = bestOffer(
        categoryOffer,
        productOffer,
        product.salePrice
      );
      await Product.findByIdAndUpdate(product._id, {
        discountedPrice,
      });
    }
    res.status(200).json({
      success: true,
      message: "category offer updated successfully!",
      offer: updatedOffer,
    });
  } catch (error) {
    console.error("Edit product offer error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error. Please try again." });
  }
};

module.exports = {
  getProductOffer,
  productOffer,
  getCategoryOffer,
  categoryOffer,
  deleteOffer,
  editProductOffer,
  editCategoryOffer,
};
