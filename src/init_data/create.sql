CREATE TABLE users(
    username VARCHAR(50) PRIMARY KEY,
    password CHAR(60) NOT NULL
);

DROP TABLE IF EXISTS teams CASCADE;
CREATE TABLE teams(
    team_id SERIAL PRIMARY KEY,
    team_name VARCHAR(50) NOT NULL,
    weekly_points SMALLINT NOT NULL,
    team_score SMALLINT NOT NULL,
    num_leagues serial NOT NULL
);

DROP TABLE IF EXISTS users_teams;
CREATE TABLE users_teams(
    username VARCHAR(50) NOT NULL,
    team_id INTEGER NOT NULL
);

DROP TABLE IF EXISTS players_teams;
CREATE TABLE players_teams(
    name varchar(50) NOT NULL,
    team_id INTEGER NOT NULL
);

DROP TABLE IF EXISTS players;
CREATE TABLE players(
    playerID serial primary key,
    name varchar(50) not null,
    team varchar(50) not null,
    jersey smallint,
    position varchar(50)
);


