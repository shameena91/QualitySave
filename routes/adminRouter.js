const express = require("express");
const router = express.Router();
const customerController = require("../controllers/admin/customerController");
const adminController = require("../controllers/admin/adminController");
const categoryController = require("../controllers/admin/categoryController");
const productController = require("../controllers//admin/productController");
const brandController = require("../controllers/admin/brandContoller");
const orderController = require("../controllers/admin/orderController");
const couponController = require("../controllers/admin/couponController");
const salesReportController = require("../controllers/admin/salesReportController");
const ledgerController = require("../controllers/admin/ledgerController");
const offrController = require("../controllers/admin/offerController");

const { userAuth, adminAuth } = require("../middlewares/auth");
const multer = require("multer");
const storage = require("../helpers/multer");
const uploads = multer({ storage: storage });

router.get("/pageerror", adminController.pageError);
router.get("/admin/login", adminController.loadLogin);
router.post("/admin/login", adminController.login);
router.get("/admin/dashboard", adminAuth, adminController.loadDashboard);

router.get(
  "/admin/dashboard/chart-data",
  adminAuth,
  adminController.loadchartData
);

router.get("/admin/logout", adminController.adminlogout);
router.get("/admin/users", adminAuth, customerController.customerInfo);
router.get("/admin/blockUser", adminAuth, customerController.customerBlocked);
router.get(
  "/admin/unblockUser",
  adminAuth,
  customerController.customerUnBlocked
);

// category Route

router
  .route("/admin/category")
  .get(adminAuth, categoryController.loadCategory)
  .post(adminAuth, categoryController.addCategory);

router
  .route("/admin/category/:id")
  .get(adminAuth, categoryController.editCategory)
  .put(adminAuth, categoryController.updateCategory)
  .delete(adminAuth, categoryController.deleteCategory);

router.get(
  "/admin/categoryListed",
  adminAuth,
  categoryController.categoryListed
);
router.get(
  "/admin/categoryunListed",
  adminAuth,
  categoryController.categoryunListed
);
router.get("/admin/productList", adminAuth, productController.productList);
router
  .route("/admin/addProducts")
  .get(adminAuth, productController.addProduct)
  .post(adminAuth, uploads.array("images", 3), productController.postProducts);

router
  .route("/admin/productList/:id")
  .delete(adminAuth, productController.deleteProduct);

router.get(
  "/admin/edit-product/:id",
  adminAuth,
  productController.geteditProduct
);
router.post(
  "/admin/editProduct/:productId",
  adminAuth,
  uploads.array("images", 3),
  productController.editProduct
);
router.delete(
  "/admin/deleteImage",
  adminAuth,
  productController.deleteSingleImage
);

// Brand Route
router
  .route("/admin/brand")
  .get(adminAuth, brandController.loadBrandPage)
  .post(adminAuth, uploads.single("image"), brandController.addBrand);

router.route("/admin/brand/:id").delete(adminAuth, brandController.deleteBrand);

router.patch(
  "/admin/brand/:id",
  adminAuth,
  uploads.single("image"),
  brandController.editBrand
);

router
  .route("/admin/brand/:id/block")
  .post(adminAuth, brandController.blockBrand);

router
  .route("/admin/brand/:id/unblock")
  .patch(adminAuth, brandController.unblockBrand);

router.get("/admin/blockProduct", adminAuth, productController.blockProduct);
router.get(
  "/admin/unblockProduct",
  adminAuth,
  productController.unblockProduct
);

// orderManagement

router.get(
  "/admin/orderManagement",
  adminAuth,
  orderController.getOrderDetails
);

router.patch(
  "/admin/update-status/:orderId/:productId",
  adminAuth,
  orderController.updateStatus
);
router.get(
  "/admin/orderView/:orderId/:productId",
  adminAuth,
  orderController.orderView
);

router.patch(
  "/admin/update-return/:orderId/:productId",
  adminAuth,
  orderController.updateReturnStatus
);

router.get("/admin/coupons", adminAuth, couponController.getCoupon);
router.post("/admin/coupons", adminAuth, couponController.addCoupon);

router.get("/admin/offers/product", adminAuth, offrController.getProductOffer);
router.post("/admin/offers/product", adminAuth, offrController.productOffer);
router.get("/admin/offers/category", adminAuth, offrController.getCategoryOffer);
router.post("/admin/offers/category", adminAuth, offrController.categoryOffer);
router.delete(
  "/admin/offers/:offerId",
  adminAuth,
  offrController.deleteOffer
);
router.put("/admin/offers/product", adminAuth, offrController.editProductOffer);

router.put("/admin/offers/category", adminAuth, offrController.editCategoryOffer);

router.patch(
  "/admin/editCoupon/:couponId",
  adminAuth,
  couponController.updateCoupon
);
router.delete(
  "/admin/deleteCoupon/:couponId",
  adminAuth,
  couponController.deleteCoupon
);

router.get(
  "/admin/salesReport",
  adminAuth,
  salesReportController.downloadExcel
);
router.get(
  "/admin/salesReportpdf",
  adminAuth,
  salesReportController.downloadPDF
);
router.get("/admin/ledger", adminAuth, ledgerController.getLedger);

module.exports = router;
