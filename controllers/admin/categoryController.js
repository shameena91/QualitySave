const { response } = require("express");
const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");
const loadCategory = async (req, res) => {
  try {
    const search = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 8;
    const skip = (page - 1) * limit;

 
    const searchExp = new RegExp(search.trim(), "i");
    const categoryData = await Category.find({
      name: { $regex: searchExp },
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

  
    const totalCategories = await Category.countDocuments({
      name: { $regex: searchExp },
    });
    const totalPages = Math.ceil(totalCategories / limit);
    res.render("categoryList", {
      cat: categoryData,
      currentPage: page,
      totalCategories: totalCategories,
      totalPages: totalPages,
    });
  } catch (error) {
 
    res.redirect("/pageerror");
  }
};

const addCategory = async (req, res) => {

  if (!req.body) {
    return res.status(400).json({ error: "No data received" });
  }
  const { name, description } = req.body;
  //
  try {
    const existingCategory = await Category.findOne({
      name: { $regex: new RegExp("^" + name + "$", "i") },
    });
    if (existingCategory) {
      return res.status(400).json({ error: "category already Exista" });
    }
    const newCategory = new Category({
      name,
      description,
     
    });
    await newCategory.save();
    // res.redirect("/admin/dashboard");
    return res.status(200).json({ message: "Category added Successfully" });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
};

const categoryListed = async (req, res) => {
  try {
    let id = req.query.id;
    await Category.updateOne({ _id: id }, { $set: { isListed: true } });
    res.redirect("/admin/category");
  } catch (error) {
    res.redirect("/pageerror");
  }
};
const categoryunListed = async (req, res) => {
  try {
    let id = req.query.id;
    await Category.updateOne({ _id: id }, { $set: { isListed: false } });
    res.redirect("/admin/category");
  } catch (error) {
    res.redirect("/pageerror");
  }
};
const editCategory = async (req, res) => {
  try {
    const id = req.params.id;
    const category = await Category.findOne({ _id: id }).lean();

    res.render("editCategory", { category });
  } catch (error) {
    res.redirect("/pageerror");
  }
};

const updateCategory = async (req, res) => {
  try {
    const id = req.params.id;

    const { name, description } = req.body;

    const isExistCategory = await Category.findOne({
      name: { $regex: new RegExp("^" + name + "$", "i") },
      _id: { $ne: id },
    }).lean();

    if (isExistCategory) {
      return res
        .status(400)
        .json({ error: "category exists.please choose another one" });
    }
    const updateCategory = await Category.findByIdAndUpdate(
      id,
      {
        name: name,
        description: description,
       
      },
      { new: true }
    );

    if (updateCategory) {
      return res.status(200).json({ message: "Category updated Successfully" });
    } else {
      res.status(400).json({ error: "Category not found" });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "internal server Error" });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(404).redirect("/pageerror");
    }
    await Category.deleteOne({ _id: id });

    return res.status(200).json({ message: "Category deleted Successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "internal server Error" });
  }
};


module.exports = {
  loadCategory,
  addCategory,
  categoryListed,
  categoryunListed,
  editCategory,
  updateCategory,
  deleteCategory,
};
