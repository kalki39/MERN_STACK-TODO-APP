const express = require("express");
const session = require("express-session");
const mongoose = require("mongoose");
const mongoDbSession = require("connect-mongodb-session")(session);
const userSchema = require("./models/userModel");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extend: true }));

//create store for session id in db
const store = new mongoDbSession({
  uri: "mongodb+srv://kalkiram40:$Qwertyuiop99@kalkiapi.ncmqnei.mongodb.net/signup-user-details",
  collection: "sessions",
});

//middleware for storing session id in client side
app.use(
  session({
    secret: "storing session id in db and cookies",
    resave: false,
    saveUninitialized: false,
    store: store,
  })
);

app.get("/signup", (req, res) => {
  res.send(`
  <html>
  <body>
  <form action="/submit" method="post" style="border:1px solid #ccc">
  <div class="container">
    <h1>Sign Up</h1>
    <p>Please fill in this form to create an account.</p>
    <hr>

    <label for="name"><b>Name</b></label>
    <input type="text" placeholder="Enter Name" name="name" required>

    <label for="email"><b>Email</b></label>
    <input type="text" placeholder="Enter Email" name="email" required>

    <label for="password"><b>Password</b></label>
    <input type="password" placeholder="Enter Password" name="password" required>


    <label>
      <input type="checkbox" checked="checked" name="remember" style="margin-bottom:15px"> Remember me
    </label>

    <p>By creating an account you agree to our <a href="#" style="color:dodgerblue">Terms & Privacy</a>.</p>

    <div class="clearfix">
      <button type="submit" class="signupbtn">Sign Up</button>
    </div>
  </div>
</form>
  </body>
  </html>
  `);
});

//get all product from db and send to client

app.post("/submit", async (req, res) => {
  try {
    let user = await userSchema.create(req.body);
    // const userDb = await user.save(); //5sec

    //storing session in Db
    req.session.isAuth = true;
    if (!user) {
      return res.status(404).json({ message: `user not found` });
    }

    console.log(req.session);

    return res.send({
      status: 201,
      message: "Register Success",
      data: user,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//restricted page
app.get("/dashboard", (req, res) => {
  console.log(req.session);
  if (req.session.isAuth) {
    return res.send("Restricted page data");
  } else {
    return res.send("Invalid session, please login again");
  }
});

// app.get("/product/", async (req, res) => {
//   try {
//     let product = await Product.find({});
//     if (!product) {
//       return res.status(404).json({ message: `product not found` });
//     }
//     return res.status(200).json(product);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// });

mongoose
  .connect(
    "mongodb+srv://kalkiram40:$Qwertyuiop99@kalkiapi.ncmqnei.mongodb.net/signup-user-details"
  )
  .then(() => {
    console.log("coonnected to db");
    app.listen(8000, () => {
      console.log("server connected 8000");
    });
  })
  .catch((err) => {
    console.log(err);
  });
