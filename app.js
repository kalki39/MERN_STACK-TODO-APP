const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const mongoDbSession = require("connect-mongodb-session")(session);
const clc = require("cli-color");
const bcrypt = require("bcrypt");
const { cleanUpAndValidate } = require("./utlis/AuthUtils");
const userSchema = require("./models/userSchema");
const { isAuthMiddleware } = require("./middlewares/isAuthMiddleware");
const validator = require("validator");
const todoSchema = require("./models/todoSchema");
// const Product = require("./models/productModel");

//variables
const app = express();
const PORT = process.env.PORT || 8000;
const saltRound = 11; //for 11 round hash the password
const MONGO_URI =
  "mongodb+srv://kalkiram40:$Qwertyuiop99@kalkiapi.ncmqnei.mongodb.net/todo-app-node-api";

//middleware it convert res.body from binary to json
app.use(express.json());
app.use(express.urlencoded({ extend: true }));
app.use(express.static("public"));

//middleware for session id
const store = new mongoDbSession({
  uri: MONGO_URI,
  collection: "sessions",
});

app.use(
  session({
    secret: "this is dashborad page session cookies",
    resave: false,
    saveUninitialized: false,
    store: store,
  })
);

//view engine is responseble for compile in client side like v8 in server
app.set("view engine", "ejs");

//db connection
mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log(clc.green.bold("DATABASE CONNECTED"));
  })
  .catch((err) => {
    console.log(clc.red.bold(err));
  });

// routes
app.get("/", (req, res) => {
  res.send("server");
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.post("/register", async (req, res) => {
  const { name, email, username, password } = req.body;
  try {
    //data validation
    await cleanUpAndValidate({ name, email, username, password }); //we pass arg inside {} bracket so order of arg is any thing

    //check user already exist by email and username
    const userExistEmail = await userSchema.findOne({ email }); //syntax is findOne({email:email})
    if (userExistEmail) {
      return res.send({
        status: 400,
        message: "User already exist",
      });
    }

    const userExistUsername = await userSchema.findOne({ username });
    if (userExistUsername) {
      return res.send({
        status: 400,
        message: "Username Already exits",
      });
    }

    //hash the user password using bcrypt before store in db
    const hashPassword = await bcrypt.hash(password, saltRound);

    //store data in db
    const user = new userSchema({
      name: name,
      email: email,
      password: hashPassword,
      username: username,
    });

    try {
      const userDb = await user.save();
      console.log(userDb);
      return res.send({
        status: 201,
        message: "User register successfully",
        data: userDb,
      });
    } catch (error) {
      return res.send({
        status: 500,
        message: "Database error",
        error: error,
      });
    }
  } catch (error) {
    return res.send({
      status: 400,
      message: "Data Invalid",
      error: error,
    });
  }
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/login", async (req, res) => {
  //validate the data
  console.log(req.body);
  const { loginId, password } = req.body;

  if (!loginId || !password) {
    return res.send({
      status: 400,
      message: "missing credentials",
    });
  }

  if (typeof loginId !== "string" || typeof password !== "string") {
    return res.send({
      status: 400,
      message: "Invalid data format",
    });
  }

  //identify the loginId and search in database

  try {
    let userDb;
    if (validator.isEmail(loginId)) {
      userDb = await userSchema.findOne({ email: loginId });
    } else {
      userDb = await userSchema.findOne({ username: loginId });
    }

    if (!userDb) {
      return res.send({
        status: 400,
        message: "User not found, Please register first",
      });
    }

    //password compare bcrypt.compare
    const isMatch = await bcrypt.compare(password, userDb.password);

    if (!isMatch) {
      return res.send({
        status: 400,
        message: "Password Does not match",
      });
    }

    //Add session base auth sys
    console.log(req.session);
    req.session.isAuth = true;
    req.session.user = {
      username: userDb.username,
      email: userDb.email,
      userId: userDb._id,
    };

    // return res.send({
    //   status: 200,
    //   message: "Login Successfull",
    // });
    return res.redirect("/dashboard");
  } catch (error) {
    console.log(error);
    return res.send({
      status: 500,
      message: "Database error",
      error: error,
    });
  }
});

//after user login it go to dashboard
app.get("/dashboard", isAuthMiddleware, async (req, res) => {
  //isAuth is a middleware function it check session id in cookies before going to dashboard
  console.log(req.session);
  const username = req.session.user.username;

  //search all todo list in db of current user using name
  try {
    const todos = await todoSchema.find({ username: username }); //it return all toodo in array from db
    console.log(todos);
    return res.render("dashboard", { todos: todos }); //todo array pass to dashborad html page to map all todo data
  } catch (error) {
    return res.send({
      status: 500,
      message: "Database error",
      error: error,
    });
  }
});

//logout
app.post("/logout", isAuthMiddleware, (req, res) => {
  //isAuth is a middleware function it check session id in cookies before going to dashboard
  console.log(req.session);
  req.session.destroy((err) => {
    if (err) throw err;

    return res.redirect("/login");
  });
});

//logout from all device
app.post("/logout_from_all_devices", isAuthMiddleware, async (req, res) => {
  //isAuth is a middleware function it check session id in cookies before going to dashboard

  const username = req.session.user.username;

  //creating session model
  const Schema = mongoose.Schema;

  const sessionSchema = new Schema({ _id: String }, { strict: false });

  const sessionModel = mongoose.model("session", sessionSchema); //when we create model , name should be singular -"session"

  try {
    const deleteCount = await sessionModel.deleteMany({
      //it delete all data has same username and return count
      "session.user.username": username,
    });
    return res.redirect("/login");
  } catch (error) {
    res.send({
      status: 500,
      message: "Logout failed",
      error: error,
    });
  }
});

//todo's api
app.post("/create-item", isAuthMiddleware, async (req, res) => {
  console.log(req.body);

  const todoText = req.body.todo; ///todo is from user client

  //data validation
  if (!todoText) {
    return res.send({
      status: 400,
      message: "missing credential",
    });
  }

  if (typeof todoText != "string") {
    return res.send({
      status: 400,
      message: "invalid input",
    });
  }

  if (todoText.length > 100) {
    return res.send({
      status: 400,
      message: "input length is too long",
    });
  }

  //initialize  todo schema in db

  const todo = new todoSchema({
    todo: todoText,
    username: req.session.user.username,
  });

  try {
    const todoDb = await todo.save();
    return res.send({
      status: 200,
      message: "Todo created successfully",
      data: todoDb,
    });
  } catch (error) {
    return res.send({
      status: 500,
      message: "Database error",
    });
  }
  return res.send(req.body.todo);
});

//edit todo
app.post("/edit-item", isAuthMiddleware, async (req, res) => {
  console.log(req.body);

  const { id, newData } = req.body; /// using id we search in db and update the todo

  //data validation
  if (!id || !newData) {
    return res.send({
      status: 400,
      message: "missing credential",
    });
  }

  if (typeof newData != "string") {
    return res.send({
      status: 400,
      message: "invalid input",
    });
  }

  if (newData.length > 100) {
    return res.send({
      status: 400,
      message: "input length is too long",
    });
  }

  try {
    const tododb = await todoSchema.findByIdAndUpdate(
      { _id: id },
      { todo: newData }
    );

    return res.send({
      status: 200,
      message: "Todo updated successfully",
      data: tododb,
    });
  } catch (error) {
    return res.send({
      status: 500,
      message: "Database error",
    });
  }
  return res.send(req.body.todo);
});
app.post("/delete-item", isAuthMiddleware, async (req, res) => {
  console.log(req.body);

  const { id } = req.body; /// using id we search in db and update the todo

  //data validation
  if (!id) {
    return res.send({
      status: 400,
      message: "missing credential",
    });
  }

  try {
    const tododb = await todoSchema.findOneAndDelete({ _id: id });

    return res.send({
      status: 200,
      message: "Todo deleted successfully",
      data: tododb,
    });
  } catch (error) {
    return res.send({
      status: 500,
      message: "Database error",
    });
  }
});

app.get("/read-item", async (req, res) => {
  //this route for after user create new todo that data is stored in db
  console.log(req.session.user.username); //we need to get all todo data and send to client side to map all
  const user_name = req.session.user.username; //todo in list
  try {
    const todos = await todoSchema.find({ username: user_name });

    if (todos.length === 0)
      return res.send({
        status: 400,
        message: "Todo is empty, Please create some.",
      });

    return res.send({
      status: 200,
      message: "Read Success",
      data: todos,
    });
  } catch (error) {
    return res.send({
      status: 500,
      message: "Database error",
      error: error,
    });
  }
});
//get all product from db and send to client

app.get("/product/", async (req, res) => {
  try {
    let product = await Product.find({});
    if (!product) {
      return res.status(404).json({ message: `product not found` });
    }
    return res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.listen(PORT, () => {
  console.log(clc.yellow.bold("server connected "));
  console.log(clc.yellow.underline(`http://localhost:${PORT}`));
});
