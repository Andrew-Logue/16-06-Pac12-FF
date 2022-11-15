const express = require("express");
const app = express();
const pgp = require("pg-promise")();
const bodyParser = require("body-parser");
const session = require("express-session");
const bcrypt = require("bcrypt");
const axios = require("axios");

// database configuration
const dbConfig = {
  host: "db",
  port: 5432,
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
};
app.use(express.static(__dirname + "/"));
const db = pgp(dbConfig); // test your database
db.connect()
  .then((obj) => {
    console.log("Database connection successful"); // you can view this message in the docker compose logs
    obj.done(); // success, release the connection;
  })
  .catch((error) => {
    console.log("ERROR:", error.message || error);
  });

app.set("view engine", "ejs");
app.use(bodyParser.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    saveUninitialized: false,
    resave: false,
  })
);
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

app.get("/", (req, res) => {
  res.redirect("/login"); //this will call the /anotherRoute route in the API
});

app.get("/pages", (req, res) => {
  res.render("pages/register");
}); // Register submission

app.post("/register", async (req, res) => {
  //the logic goes here
  const hash = await bcrypt.hash(req.body.password, 10);
  const query = `INSERT INTO users (username, password) VALUES ($1, $2);`;

  db.any(query, [req.body.username, hash])
    .then(function (data) {
      res.redirect("/login");
    })
    .catch(function (err) {
      res.redirect("/register");
      return console.log(err);
    });
});

app.get("/login", (req, res) => {
  res.render("pages/login");
});

app.get("/register", (req, res) => {
  res.render("pages/register");
});

app.post("/login", async (req, res) => {
  const query = "SELECT * FROM users WHERE username = $1;";

  db.one(query, [req.body.username, req.body.password])
    .then(async (user) => {
      const match = await bcrypt.compare(req.body.password, user.password); //await is explained in #8
      if (match) {
        req.session.user = {
          api_key: process.env.API_KEY,
        };
        req.session.save();
        res.redirect("/discover");
      } else {
        //they dont match
        res.redirect("pages/login", {
          message: "Incorrect Password",
          error: true,
        }); // throw new error;
      }
    })
    .catch(function (err) {
      res.redirect("/register");
      return console.log(err);
    });
});

app.get("/leagues", (req, res) => {
  const query = "SELECT * FROM teams ORDER BY team_score DESC;";
  db.any(query)
    .then(result => {
      console.log(result);
      res.render("pages/leagues", {teams:result});
    })
    .catch(err => {
      console.log(err);
      res.render("pages/leagues", {teams:""});
    })
});

// Authentication Middleware.
// const auth = (req, res, next) => {
//   if (!req.session.user) {
//     // Default to register page.
//     return res.redirect("/home");
//   }
//   next();
// }; // Authentication Required
// app.use(auth);
// app.get("/discover", (req, res) => {
//   axios({
//     url: `https://app.ticketmaster.com/discovery/v2/events.json`,
//     method: "GET",
//     dataType: "json",
//     params: {
//       apikey: req.session.user.api_key,
//       keyword: "music", //you can choose any artist/event here
//       size: 10,
//     },
//   })
//     .then((results) => {
//       // console.log(results.data._embedded.events); // the results will be displayed on the terminal if the docker containers are running // Send some parameters
//       res.render("pages/discover", { events: results.data._embedded.events });
//     })
//     .catch((err) => {
//       res.render("pages/discover", { events: [] }); // Handle errors
//       return console.log(err);
//     });
// });
app.get("/logout", (req, res) => {
  req.session.destroy();
  res.render("pages/login", { message: "Logged out successfully" });
});

app.listen(3000);
console.log("Server is listening on port 3000");
