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

const db = pgp(dbConfig);

// test your database
db.connect()
  .then((obj) => {
    console.log("Database connection successful"); // you can view this message in the docker compose logs
    obj.done(); // success, release the connection;
  })
  .catch((error) => {
    console.log("ERROR:", error.message || error);
  });

// players db init
app.post("/updatePlayersTable", (req, res) => {
  const Pac12Teams = [
    "Arizona",
    "Arizona State",
    "California",
    "Colorado",
    "Oregon",
    "Oregon State",
    "Stanford",
    "UCLA",
    "USC",
    "Utah",
    "Washington",
    "Washington State",
  ];
  Pac12Teams.forEach(async (team) => {
    await axios
      .get("https://api.collegefootballdata.com/player/search", {
        params: {
          searchTerm: " ",
          team: team,
          year: "2022",
        },
        headers: {
          accept: "application/json",
          Authorization:
            "Bearer a17B6qjuCrgQQFMcCxVEDheQmnj1RExx4foTdOprk32EwkvfZOHuD4siQ8pUjmB/",
        },
      })
      .then(async (results) => {
        await db.any("delete from players;");
        results.data.forEach(async (player) => {
          const insert = `insert into players (name, team, jersey, position) values ($1,$2,$3,$4);`;
          await db.any(insert, [
            player.name,
            player.team,
            player.jersey,
            player.position,
          ]);
        });
      });
  });
});

app.get("/getAllPlayers",async (req,res)=>{
  const query = "select * from players;";
  await db.any(query).then((results)=>{
    //console.log(results); //uncomment to test if /updatePlayersWorked
    res.send(results);
});
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
app.listen(3000);
console.log("Server is listening on port 3000");

app.get("/", async (req, res) => {
  await axios.get('https://api.collegefootballdata.com/games', {
    params: {
        'year': '2022',
        'week': '14',
        'seasonType': 'regular',
        'conference': 'Pac'
    },
    headers: {
        'accept': 'application/json',
        'Authorization': 'Bearer a17B6qjuCrgQQFMcCxVEDheQmnj1RExx4foTdOprk32EwkvfZOHuD4siQ8pUjmB/'
    }
  }).then(async (results1)=>{
    const query = "select * from teams order by team_score desc limit 5;";
    await db.any(query).then((results2)=>{
    res.render("pages/home", { topTeams: results2, upcomingGames: results1.data });
  })
  });
});

app.get("/draft", (req, res) => {
  const query = "SELECT * FROM players WHERE position = 'QB' AND position = 'RB' AND position = 'WR' AND position = 'TE' ORDER BY position ASC;";

  db.any(query)
    .then((result) => {
      console.log(result);
      res.render("pages/draft", { players: result });
    })
    .catch((err) => {
      console.log(err);
      res.render("pages/draft", { players: [], message: err.message, });
    });
});

app.post("/draft/add", (req, res) => {
  const name = parseInt(req.body.name);
  const username = req.session.user.username;
  const team_id = "SELECT team_ID FROM users_teams WHERE username = $1";
  db.tx(async (t, [username]) => {
    
  const [row] = await t.any(
    `SELECT
          COUNT(*)
        FROM
          players_teams
        WHERE
          team_id = $1`,
    [team_id]
  );
  if (row.count > 7) {
    throw new Error(`There are too many players on your team! (Maximum of 8)`);
  }

  await t.none(
    "INSERT INTO players_teams(name, team_id) VALUES ($1, $2);",
    [name, team_id]
  );
  })

  .then((result) => {
    res.render("pages/draft", {
      players: result,
      message: `Successfully added player! ${req.body.playerID}`,
    });
  })
  .catch((err) => {
    res.render("pages/draft", {
      players: [],
      message: err.message,
    });
  });
});

// app.post("/draft/delete", (req, res) => {
//   const playerID = parseInt(req.body.playerID);
//   const username = req.session.user.username;
//   const team_id = "SELECT team_ID FROM users_teams WHERE username = $1";

//   db.task("delete-course", (task) => {
//     return task.batch([
//       task.none(
//         `DELETE FROM
//             players_teams
//           WHERE
//             playerID = $1
//             AND team_id = '$2';`,
//             [playerID, team_id]
//       )
//     ]);
//   })

//   .then((result) => {
//     res.render("pages/draft", {
//       players: result,
//       message: `Successfully removed player! ${req.body.playerID}`,
//     });
//   })
//   .catch((err) => {
//     res.render("pages/draft", {
//       players: [],
//       message: err.message,
//     });
//   });
// });

app.get("/welcome", async (req, res) => {
  await axios.get('https://api.collegefootballdata.com/games', {
    params: {
        'year': '2022',
        'week': '14',
        'seasonType': 'regular',
        'conference': 'Pac'
    },
    headers: {
        'accept': 'application/json',
        'Authorization': 'Bearer a17B6qjuCrgQQFMcCxVEDheQmnj1RExx4foTdOprk32EwkvfZOHuD4siQ8pUjmB/'
    }
  }).then(async (results1)=>{
    const query = "select * from teams order by team_score desc limit 5;";
    await db.any(query).then((results2)=>{
    res.render("pages/welcome", { topTeams: results2, upcomingGames: results1.data, username: req.session.user.username });
  })
  });

});

app.post("/register", async (req, res) => {
  //the logic goes here
  const hash = await bcrypt.hash(req.body.password, 10);
  const query = `INSERT INTO users (username, password) VALUES ($1, $2);`;

  db.any(query, [req.body.username, hash])
    .then(function (data) {
      res.redirect("/login");
    })
    .catch(function (err) {
      res.render("pages/register", { message: "Username taken" });
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
          username: req.body.username,
        };
        req.session.save();
        res.redirect("/welcome");
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
    .then((result) => {
      console.log(result);
      res.render("pages/leagues", { user_teams: result });
    })
    .catch((err) => {
      console.log(err);
      res.render("pages/leagues", { user_teams: [] });
    });
});

app.get("/my_profile", (req, res) => {
  const query = "SELECT * FROM users;";
  const query2 = "SELECT * FROM teams";
  db.task("get-everything", (task) => {
    return task.batch([task.any(query), task.any(query2)]);
  })
    .then((result) => {
      console.log(result);
      res.render("pages/my_profile", { users: result[0], teams: result[1] });
    })
    .catch((err) => {
      console.log(err);
      res.render("pages/my_profile", { users: "", teams: "" });
    });
});
app.get("/logout", (req, res) => {
  req.session.destroy();
  res.render("pages/login", { message: "Logged out successfully" });
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

app.get("/changeUsername",(req,res)=>{
  res.render("pages/changeUsername");
});

app.get("/changePassword",(req,res)=>{
  res.render("pages/changePassword");
});

app.post("/updateUsername",(req,res)=>{
  const update= "update users set username = $1 where username = $2;";
  db.any(update,[req.body.username,req.session.user.username])
  .then( (ret)=>{
    req.session.user = {
      username: req.body.username,
    };
    req.session.save();
    res.redirect("/my_profile");
  });
});

app.post("/updatePassword",async (req,res)=>{
  const update= "update users set password = $1 where username = $2;";
  const hash = await bcrypt.hash(req.body.password, 10);
  db.any(update,[hash,req.session.user.username])
  .then( (ret)=>{
    req.session.user = {
      username: req.body.username,
    };
    req.session.save();
    res.redirect("/my_profile");
  });
});

app.post("/addNewTeam",async(req,res)=>{
const insert = "insert into teams (team_name, weekly_points, team_score, num_leagues) values ($1,0,0,0);";
await db.any(insert,[req.body.teamName])
.then(async()=>{
const query = "select team_id from teams where team_name = $1;";
await db.any(query,[req.body.teamName])
.then(async (result)=>{
  const ins = "insert into users_teams (username,team_id) values ($1,$2);";
  await db.any(insert,[req.session.user.username,result]);
  res.redirect("/draft");
}

)})});