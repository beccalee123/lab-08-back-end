'use strict';

// Application dependencies (Express & CORS)

const express = require('express');
const superagent = require('superagent');
const cors = require('cors');
const pg = require('pg');

// Load environment variables with DotENV

require('dotenv').config();

// Application setup

const PORT = process.env.PORT; // environment variables
const app = express(); // creates app instance
app.use(cors()); // tells app to use cors

//Database Setup
const client = new pg.Client(process.env.DATABASE_URL);
client.connect();
client.on('error', err => console.error(err));

// API Routes

app.get('/location', getLocation);

// app.get('/location', (request, response) => {
//   searchToLatLong(request.query.data)
//     .then((location) => response.send(location))
//     .catch((error) => handleError(error, response));
// });

app.get('/weather', getWeather);
app.get('/yelp', getRestaurants);
app.get('/movies', getMovies);
app.get('/meetups', getMeetups);
app.get('/trails', getTrails);


//Handlers

function getLocation(request, response) {
  Location.lookupLocation({
    tableName: Location.tableName,

    query: request.query.data,

    cacheHit: function (result) {
      console.log(result.rows[0]);
      response.send(result.rows[0]);
    },

    cacheMiss: function () {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${this.query}&key=${process.env.GEOCODE_API_KEY}`;

      return superagent.get(url)
        //Recieve info
        .then((result) => {
          console.log(result.body);
          const location = new Location(this.query, result.body);
          location.save()
            .then(location => response.send(location));
        })
        .catch((error, res) => handleError(error, res));
    }
  })
}

// Helper Functions

// function searchToLatLong(query) {
//   //Originally this referenced getting mock data from the JSON file as initial set up. Since the project is designed to work with APIs the code needed to be updated to submit search queries to APIs and return results.

//   //Concatenate URL
//   // const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${query}&key=${process.env.GEOCODE_API_KEY}`;

//   //Make proxy request
//   return superagent.get(url)
//     //Recieve info
//     .then((res) => {
//       //return new instance/modify object
//       return new Location(query, res.body.results[0]);
//     })
//     .catch((error, res) => handleError(error, res));
// }

function getWeather(request, response) {
  const url = `https://api.darksky.net/forecast/${process.env.DARKSKY_API_KEY}/${request.query.data.latitude},${request.query.data.longitude}`;

  superagent.get(url)
    .then(result => {
      const weatherSummaries = result.body.daily.data.map(day => {
        return new Weather(day);
      });

      response.send(weatherSummaries);
    })
    .catch(error => handleError(error, response));
}

function getRestaurants(request, response) {
  const url = `https://api.yelp.com/v3/businesses/search?term=restaurants&latitude=${request.query.data.latitude}&longitude=${request.query.data.longitude}`;

  superagent.get(url)
    .set('Authorization', `Bearer ${process.env.YELP_API_KEY}`)
    .then(result => {
      const restaurantSummaries = result.body.businesses.map(business => {
        return new Restaurant(business);
      });
      response.send(restaurantSummaries);
    })
    .catch(error => handleError(error, response));
}

function getMovies(request, response) {
  const url = `https://api.themoviedb.org/3/search/movie?api_key=${process.env.MOVIESDB_API_KEY}&language=en-US&query=${request.query.data.search_query}`

  superagent.get(url)
    .then(result => {
      console.log(result.body);
      const movieSummaries = result.body.results.map(film => {
        return new Movie(film);
      });
      response.send(movieSummaries);
    })
    .catch(error => handleError(error, response));
}

function getMeetups(request, response) {
  const url = `https://api.meetup.com/find/upcoming_events?key=${process.env.MEETUP_API_KEY}&lat=${request.query.data.latitude}&lon=${request.query.data.longitude}&page=20`;

  superagent.get(url)
    .then(result => {
      const meetupSummaries = result.body.events.map(meetups => {
        return new Meetup(meetups);
      });
      response.send(meetupSummaries);
    })
    .catch(error => handleError(error, response));
}

function getTrails(request, response) {
  const url = `https://www.hikingproject.com/data/get-trails?lat=${request.query.data.latitude}&lon=${request.query.data.longitude}&key=${process.env.HIKING_API_KEY}`;

  superagent.get(url)
    .then(result => {
      const trailSummaries = result.body.trails.map(hikes => {
        return new Trail(hikes);
      });
      response.send(trailSummaries);
    })
    .catch(error => handleError(error, response));
}

//Error Handling

//Error handler for alerting developer in node if the internal server is having issues processing the request. This will help debug the code if there are issues with it populating in the client side app.
function handleError(error, res) {
  console.error(error);
  if (res) res.status(500).send('Sorry, something broke');
}

//Models

//This object constructor designates the information we want to recieve back from the API. As a result of this, the API will return an object with the requested data.

function Location(query, res) {
  this.tableName = 'locations';
  this.search_query = query;
  this.formatted_query = res.results[0].formatted_address;
  this.latitude = res.results[0].geometry.location.lat;
  this.longitude = res.results[0].geometry.location.lng;
  this.created_at = Date.now();
}

Location.lookupLocation = (location) => {
  const SQL = `SELECT * FROM locations WHERE search_query=$1;`;
  const values = [location.query];

  return client.query(SQL, values)
    .then(result => {
      if (result.rowCount > 0) {
        console.log('We have a match for location');
        location.cacheHit(result);
      } else {
        console.log('We do not have a location match');
        location.cacheMiss();
      }
    })
    .catch(console.error);
}

//Location.prototype.save = function() and so on
Location.prototype = {
  save: function () {
    const SQL = `INSERT INTO locations (search_query, formatted_query, latitude, longitude) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`
    const values = [this.search_query, this.formatted_query, this.latitude, this.longitude];

    return client.query(SQL, values)
      .then(result => {
        this.id = result.rows[0].id;
        return this;
      });
  }
};

function Weather(day) {
  this.forecast = day.summary;
  this.time = new Date(day.time * 1000).toString().slice(0, 15);
}

function Restaurant(business) {
  this.name = business.name;
  this.image_url = business.image_url;
  this.price = business.price;
  this.rating = business.rating;
  this.url = business.url;
}

function Movie(film) {
  this.title = film.title;
  this.overview = film.overview;
  this.average_votes = film.vote_average;
  this.total_votes = film.vote_count;
  this.image_url = `http://image.tmdb.org/t/p/w185/${film.poster_path}`;
  this.popularity = film.popularity;
  this.released_on = film.release_date;
}

function Meetup(meetups) {
  this.link = meetups.link;
  this.name = meetups.name;
  this.host = meetups.group.name;
  this.creation_date = new Date(meetups.created).toDateString();
}

function Trail(hikes) {
  this.trail_url = hikes.trail_url;
  this.name = hikes.name;
  this.location = hikes.location;
  this.length = hikes.length;
  this.condition_date = hikes.conditionDate.slice(0, 10);
  this.condition_time = hikes.conditionDate.slice(11, hikes.conditionDate.length);
  this.conditions = hikes.conditionStatus;
  this.stars = hikes.stars;
  this.star_votes = hikes.starVotes;
  this.summary = hikes.summary;
}

// Make sure the server is listening for requests
app.listen(PORT, () => console.log(`App is up on ${PORT}`));
