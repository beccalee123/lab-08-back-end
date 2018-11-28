DROP TABLE locations, weathers, restaurants, movies;

CREATE TABLE IF NOT EXISTS locations (
  id SERIAL PRIMARY KEY,
  search_query VARCHAR(255),
  formatted_query VARCHAR(255),
  latitude NUMERIC(8, 6),
  longitude NUMERIC(9, 6)
);

CREATE TABLE IF NOT EXISTS weathers (
  id SERIAL PRIMARY KEY,
  forecast VARCHAR(255),
  time VARCHAR(255),
  created_at BIGINT,
  location_id INTEGER NOT NULL REFERENCES locations(id)
);

CREATE TABLE IF NOT EXISTS restaurants (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  image_url VARCHAR(255),
  price CHAR(5),
  rating NUMERIC(2, 1),
  url VARCHAR(255),
  created_at BIGINT,
  location_id INTEGER NOT NULL REFERENCES locations(id)
);

CREATE TABLE IF NOT EXISTS movies (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255),
  overview VARCHAR(4000),
  average_votes FLOAT,
  total_votes INTEGER,
  image_url VARCHAR(400),
  popularity FLOAT,
  released_on VARCHAR(255),
  created_at BIGINT,
  location_id INTEGER NOT NULL REFERENCES locations(id)
);