const Brand = require("../../models/brandSchema");
const Product = require("../../models/productSchema");

const loadBrandPage = async (req, res) => {
  try {
    const page = parseInt(req.query.page || 1);
    const limit = 4;
    const skip = (page - 1) * limit;

    const brandData = await Brand.find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalBrands = await Brand.countDocuments();
    const totalPages = Math.ceil(totalBrands / limit);

    res.render("brandInfo", {
      currentPage: page,
      totalBrands: totalBrands,
      data: brandData,
      totalPages: totalPages,
    });
  } catch (error) {
    console.log(error);
    res.redirect("/pageerror");
  }
};

const addBrand = async (req, res) => {
  try {
    const brand = req.body.name?.trim();
    const image = req.file?.filename;

    const page = parseInt(req.query.page || 1);
    const limit = 4;
    const skip = (page - 1) * limit;

    const totalBrands = await Brand.countDocuments();
    const totalPages = Math.ceil(totalBrands / limit);
    const brandList = await Brand.find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    if (!brand || !image) {
      return res.status(400).render("brandInfo", {
        error: "Brand name and image are required.",
        data: brandList,
        currentPage: page,
        totalBrands,
        totalPages,
      });
    }

    const findbrand = await Brand.findOne({ brandName: brand });

    if (findbrand) {
      return res.status(400).render("brandInfo", {
        error: "Brand already exists.",
        data: brandList,
        currentPage: page,
        totalBrands,
        totalPages,
      });
    }

    const newbrand = new Brand({
      brandName: brand,
      brandImage: image,
      isBlocked: false,
    });

    await newbrand.save();
    res.redirect("/admin/brand");
  } catch (error) {
    console.log(error);
    res.redirect("/pageerror");
  }
};


const editBrand = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    console.log(id,name)

    const updateData = {
      brandName: name, // 🔁 use the correct field name from your schema
    };

    if (req.file) {
      console.log("Uploaded file:", req.file.filename);
      updateData.brandImage = req.file.filename;
    }

    const updatedBrand = await Brand.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    if (updatedBrand) {
      return res.json({
        success: true,
        message: "Brand updated successfully",
        brand: updatedBrand, // optional: return updated brand if needed
      });
    } else {
      return res.json({
        success: false,
        message: "Brand not found or update failed",
      });
    }
  } catch (error) {
    console.error("Edit brand failed:", error);
    return res.json({
      success: false,
      message: "Something went wrong, please try again.",
    });
  }
};


const deleteBrand = async (req, res) => {
  try {
    const brandId = req.params.id;
    const brand = await Brand.findOne({ _id: brandId });
    await Brand.findByIdAndDelete(brandId);
    res
      .status(200)
      .json({ message: `The ${brand.brandName} brand deleted successfully` });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error deleting brand", error });
  }
};

const blockBrand = async (req, res) => {
  try {
    const brandId = req.params.id;
    console.log("Brand ID to block:", brandId);

    const updatedBrand = await Brand.findByIdAndUpdate(
      brandId,
      { isBlocked: true },
      { new: true }
    );

    if (!updatedBrand) {
      return res.status(404).json({ message: "Brand not found." });
    }

    res.status(200).json({ message: "Brand has been blocked." });
  } catch (error) {
    console.error("Error blocking brand:", error.message);
    res.status(500).json({
      message: "Failed to block the brand.",
      error: error.message || "Unknown server error.",
    });
  }
};

const unblockBrand = async (req, res) => {
  try {
    const brandId = req.params.id;

    const findBrand = await Brand.findByIdAndUpdate(
      brandId,
      { isBlocked: false },
      { new: true }
    );

    if (!findBrand) {
      return res.status(404).json({ message: "Brand not found." });
    }
    res.status(200).json({ message: "Brand has been unblocked." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error blocking brand.", error });
  }
};

module.exports = {
  loadBrandPage,
  addBrand,
  editBrand,
  deleteBrand,
  blockBrand,
  unblockBrand,
};
