const User = require("../../models/userSchema");
const Address = require("../../models/addressSchema");

const getAddress = async (req, res) => {
  try {
    const userId = req.session.user;
    const userAddress = await Address.findOne({ userId }).lean();
    res.render("manage-address", { userAddress });
  } catch (error) {
    console.error("Error fetching address:", error);
    res.status(500).send("Internal Server Error");
  }
};
const getAddAddress = async (req, res) => {
  try {
    res.render("addAddress");
  } catch (error) {}
};

const addAddress = async (req, res) => {
  try {
    const userId = req.session.user;
    const {
      fullName,
      phone,
      pincode,
      city,
      houseDetails,
      state,
      landMark,
      altphone,
      addressType,
    } = req.body;
    console.log(fullName, phone, pincode, city, houseDetails, addressType);
    const userData = await User.findOne({ _id: userId });

    const userAddress = await Address.findOne({ userId: userData._id });
    if (!userAddress) {
      const newAddress = new Address({
        userId: userData._id,
        address: [
          {
            addressType,
            fullName,
            houseDetails,
            city,
            landMark,
            state,
            pincode,
            phone,
            altphone,
          },
        ],
      });
      await newAddress.save();
    } else {
      userAddress.address.push({
        addressType,
        fullName,
        houseDetails,
        city,
        landMark,
        state,
        pincode,
        phone,
        altphone,
      });
      await userAddress.save();
    }
    res.redirect("/manage-Address");
  } catch (error) {
    console.log(error);
    res.redirect("/pageNotFound");
  }
};

const editAddressPage = async (req, res) => {
  try {
    const addressId = req.params.id;
    const user = req.session.user;

    const userAddress = await Address.findOne({ userId: user }).lean();

    if (!userAddress) {
      return res.redirect("/pageNotFound");
    }

    const currAddress = userAddress.address.find(
      (addr) => addr._id.toString() === addressId
    );

    if (!currAddress) {
      return res.redirect("/pageNotFound");
    }

    res.render("edit-address", { address: currAddress });
  } catch (error) {
    console.error("Error loading edit address:", error);
    res.status(500).send("Internal Server Error");
  }
};

const updateAddress = async (req, res) => {
  try {
    const addressId = req.params.id;
    const user = req.session.user;
    const data = req.body;

    const updatedFields = {
      "address.$.addressType": data.addressType,
      "address.$.fullName": data.fullName,
      "address.$.houseDetails": data.houseDetails,
      "address.$.city": data.city,
      "address.$.state": data.state,
      "address.$.pincode": data.pincode,
      "address.$.phone": data.phone,
      "address.$.altPhone": data.altPhone,
      "address.$.landMark": data.landMark,
    };

    const result = await Address.updateOne(
      { userId: user, "address._id": addressId },
      { $set: updatedFields }
    );

    res.redirect("/manage-address");
  } catch (error) {
    console.error("Error updating address:", error);
    res.redirect("/pageNotFound");
  }
};
const deleteAddress = async (req, res) => {
try {
const addressId = req.params.id;
console.log("addressId:",addressId)


const findAddress = await Address.findOne({ "address._id": addressId });

if (!findAddress) {
  return res.status(404).json({ message: "Address not found" });
}

await Address.updateOne(
  { "address._id": addressId },
  { $pull: { address: { _id: addressId } } }
);

return res.status(200).json({success:true, message: 'Address deleted successfully' });


} catch (error) {
console.error(error);
return res.status(500).json({ message: "Server error" });
}
};





module.exports = {
  getAddress,
  getAddAddress,
  addAddress,
  editAddressPage,
  updateAddress,
  deleteAddress,
};
