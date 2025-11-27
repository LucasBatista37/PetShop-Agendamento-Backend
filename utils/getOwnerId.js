module.exports = function getOwnerId(user) {
  return user.owner ? user.owner : user._id;
};
