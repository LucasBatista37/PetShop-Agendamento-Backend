module.exports = function getOwnerId(user) {
  return user.role === "collaborator" ? user.owner : user._id;
};
