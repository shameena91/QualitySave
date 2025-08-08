const StatusEnum = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  SERVER_ERROR: 500,
};

const MessageEnum = {
  LOGIN_REQUIRED: "Please log in to add products to your cart.",
  MISSING_IDS: "Missing product or user ID",
  PRODUCT_NOT_FOUND: "Product not found",
  CART_NOT_FOUND: "Cart not found",
  CART_UPDATED: "Your cart updated successfully",
  PRODUCT_ADDED: "Product added to your cart",
  OUT_OF_STOCK: "Product out of stock",
  SERVER_ERROR: "Server Error",
};

module.exports = { StatusEnum, MessageEnum };
