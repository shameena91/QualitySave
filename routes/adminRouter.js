const express=require('express')
const router=express.Router();
const customerController=require('../controllers/admin/customerController')
const adminController=require("../controllers/admin/adminController")
const categoryController=require("../controllers/admin/categoryController")
const productController=require("../controllers//admin/productController")
const brandController=require("../controllers/admin/brandContoller")
const orderController=require('../controllers/admin/orderController')
const {userAuth,adminAuth}=require("../middlewares/auth")
const multer=require("multer")
const storage=require("../helpers/multer")
const uploads=multer({storage:storage})


router.get('/pageerror',adminController.pageError)
router.get('/admin/login',adminController.loadLogin)
router.post('/admin/login',adminController.login)
router.get("/admin/dashboard",adminAuth,adminController.loadDashboard)
router.get("/admin/logout",adminController.adminlogout)
router.get("/admin/users",adminAuth,customerController.customerInfo)
router.get("/admin/blockUser",adminAuth,customerController.customerBlocked)
router.get("/admin/unblockUser",adminAuth,customerController.customerUnBlocked)


// category Route


router
.route("/admin/category")
.get(adminAuth,categoryController.loadCategory)
.post(adminAuth,categoryController.addCategory)

router
  .route("/admin/category/:id")
  .get(adminAuth, categoryController.editCategory)  
  .put(adminAuth, categoryController.updateCategory) 
  .delete(adminAuth, categoryController.deleteCategory); 

router.get("/admin/categoryListed",adminAuth,categoryController.categoryListed)
router.get("/admin/categoryunListed",adminAuth,categoryController.categoryunListed)



// routes for product handling
router.get("/admin/productList",adminAuth,productController.productList)
router
.route('/admin/addProducts')
.get(adminAuth,productController.addProduct)
.post(adminAuth,uploads.array("images",3),productController.postProducts)

router
.route("/admin/productList/:id")
.delete(adminAuth,productController.deleteProduct)



router.get("/admin/edit-product/:id",adminAuth,productController.geteditProduct)
router.post("/admin/editProduct/:id",adminAuth,uploads.array("images",3),productController.editProduct)
router.delete("/admin/deleteImage",adminAuth,productController.deleteSingleImage)






// Brand Route
router
  .route("/admin/brand")
  .get(adminAuth, brandController.loadBrandPage)         
  .post(adminAuth, uploads.single("image"), brandController.addBrand);

router
  .route("/admin/brand/:id")
  .delete(adminAuth, brandController.deleteBrand);

router.patch("/admin/brand/:id",adminAuth,uploads.single("image"), brandController.editBrand)


router
  .route("/admin/brand/:id/block")
  .patch(adminAuth, brandController.blockBrand);

router
  .route("/admin/brand/:id/unblock")
  .patch(adminAuth, brandController.unblockBrand);

router.post("/admin/addProductOffer",adminAuth,productController.addProductOffer)

router.post("/admin/removeProductOffer",adminAuth,productController.removeProductOffer)

router.get("/admin/blockProduct",adminAuth,productController.blockProduct)
router.get("/admin/unblockProduct",adminAuth,productController.unblockProduct)


// orderManagement

router.get('/admin/orderManagement',adminAuth,orderController.getOrderDetails)











module.exports=router


