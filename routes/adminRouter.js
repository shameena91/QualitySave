const express=require('express')
const router=express.Router();
const customerController=require('../controllers/admin/customerController')
const adminController=require("../controllers/admin/adminController")
const categoryController=require("../controllers/admin/categoryController")
const {userAuth,adminAuth}=require("../middlewares/auth")


router.get('/pageerror',adminController.pageError)
router.get('/admin/login',adminController.loadLogin)

router.post('/admin/login',adminController.login)
router.get("/admin/dashboard",adminAuth,adminController.loadDashboard)
router.get("/admin/logout",adminController.adminlogout)

router.get("/admin/users",adminAuth,customerController.customerInfo)

router.get("/admin/blockUser",adminAuth,customerController.customerBlocked)

router.get("/admin/unblockUser",adminAuth,customerController.customerUnBlocked)

router.get("/admin/category",adminAuth,categoryController.loadCategory)

router.post("/admin/addCategory",adminAuth,categoryController.addCategory)
router.get("/admin/categoryListed",adminAuth,categoryController.categoryListed)

router.get("/admin/categoryunListed",adminAuth,categoryController.categoryunListed)
router.get("/admin/edit-category",adminAuth,categoryController.editCategory)
router.post("/admin/update-category",adminAuth,categoryController.updateCategory)

module.exports=router


