module.exports = {
  authController: require('./controllers/authController'),
  adminUserController: require('./controllers/adminUserController'),
  authRoutes: require('./routes/authRoutes'),
  adminUserRoutes: require('./routes/adminUserRoutes'),
  adminProfileRoutes: require('./routes/adminProfileRoutes'),
  UserModel: require('./models/userModel'),
};
