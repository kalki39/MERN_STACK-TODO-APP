const mongoose = require("mongoose");
const { schema } = require("./userSchema");

const Schema = mongoose.Schema;

const todoSchema = new Schema({
  todo: {
    type: String,
    require: true,
  },
  username: {
    type: String,
    require: true,
  },
});

module.exports = mongoose.model("todo", todoSchema);
