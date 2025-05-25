
const User=require('../../models/userSchema');
const mongoose=require('mongoose')
const bcrypt=require('bcrypt');
const Order = require('../../models/orderSchema');
const pageError=async(req,res)=>{
    res.render("admin-error")
}

const loadLogin= (req,res)=>{
    if(req.session.admin)
    {
       
        return res.redirect("/admin/dashboard")
    }
    console.log("loginpage")
    res.render("admin-login",{message:null})
}

const login= async (req,res)=>{
    try {
        console.log("login reached")
        const {email,password}=req.body;
        console.log(email)
        console.log(password)
       

        const admin=await User.findOne({email:email,isAdmin:true})
        console.log(admin)
        if(admin){
            const passwordmatch=await bcrypt.compare(password,admin.password)
            if(passwordmatch)
            {
                req.session.admin=true
                console.log("succedd")
                return res.redirect('/admin/dashboard')
            }else{
                console.log("error")
                return redirect("/admin-login")
            }
        }
    } catch (error) {
        console.log("login failed",error);
        return res.redirect("/pageerror")
        
        
    }
}
const adminlogout=async(req,res)=>{
    try {
        req.session.destroy(err=>{
            if(err)
            {
                console.log("Error occured destroying session",err);
                return res.redirect("/pageerror")
            }
            res.redirect('/admin/login')
        })
    } catch (error) {
        console.log("unexpected error during logout");
        res.redirect("/pageerror")
    }

}






const loadDashboard= async(req,res)=>{      
    try{


         const {
      reportType,
      fromDate,
      toDate,
      paymentMethod,
      status,
      search,
    } = req.query;

    
    const currentPage = parseInt(req.query.page) || 1;
    const itemsPerPage = 10;
    const skip = (currentPage - 1) * itemsPerPage;
    const filter = {};

    // // Filter by status
    // if (status && status !== 'all') {
    //   filter.status = status;
    // }

    // Filter by payment method
    if (paymentMethod && paymentMethod !== 'all') {
      filter.paymentMethod = paymentMethod;
    }

    // Date filter
    let startDate, endDate;

    const now = new Date();

    switch (reportType) {
      case 'daily':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        endDate = new Date(now.setHours(23, 59, 59, 999));
        break;
      case 'weekly':
        startDate = new Date(now.setDate(now.getDate() - 7));
        endDate = new Date();
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date();
        break;
      case 'yearly':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date();
        break;
      case 'custom':
        if (fromDate && toDate) {
          startDate = new Date(fromDate);
          endDate = new Date(toDate);
           endDate.setHours(23, 59, 59, 999); 
        }
        break;
    }

    if (startDate && endDate) {
      filter.createdOn = { $gte: startDate, $lte: endDate };
    }


    // Optional search filter (e.g., user name or product category)
    let orders = await Order.find(filter)
    .populate('couponUsed')
    .sort({createdOn:-1})
    .lean();
    console.log("my",orders)
 if (search) {
     
      if (search) {
  orders = orders.filter((order) =>
    order.orderId.toLowerCase().includes(search.toLowerCase())
  );
}
    }
 let totalOrders = orders.length;
    let totalSales = 0;
    let totalDiscount = 0;
    let totalCouponDiscount = 0;


 orders.forEach((order) => {
      totalSales += order.totalPrice || 0;
      totalDiscount += order.discount || 0;
      totalCouponDiscount+= Number(order.couponDiscount ?? 0);
    });
      
    const totalPages = Math.ceil(orders.length / itemsPerPage);
    const paginatedOrders = orders.slice(skip, skip + itemsPerPage);
console.log(req.query);

    return res.render("dashboard",{totalOrders,
                totalSale:totalSales.toLocaleString(),
                totalDiscount:totalDiscount.toLocaleString(),
                totalCouponDiscount:totalCouponDiscount.toLocaleString(),
                orders:paginatedOrders,
                filterData: req.query,
                totalPages,
                 currentPage,
               

            })

        }catch(error)
        {
            console.log(error)
            res.redirect("/pageerror")
        }
           
        


}



module.exports={loadLogin,
    login,
    loadDashboard,
    pageError,
    adminlogout}