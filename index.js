/* "StAuth10065: I Prerak Patel, 000825410 certify that this material is my original work. No other person's work has been used without due acknowledgement. I have not made my work available to anyone else." */

var Bot = require("slackbots");
var dotenv = require("dotenv").config();
var settings = {
    token: process.env.SLACK_TOKEN,
    name: "yelphelp",
};
var bot = new Bot(settings);
let yelpAPI = require("yelp-api");
const apiKey = process.env.API_KEY;
let yelp = new yelpAPI(apiKey);

var sqlite3 = require("sqlite3").verbose();

// SQLite database stored in a file named api.db.
var file = "api.db";
var db = new sqlite3.Database(file);

db.serialize(function() {
    // Creating the SQLite database
    db.run(
        "CREATE TABLE IF NOT EXISTS users ( msgid INTEGER PRIMARY KEY, status TEXT, message TEXT,timestamp TEXT);"
    );

    // If the database file and/or table already exists, they should be wiped out (e.g.delete all previous entries in the table)
    db.run("DELETE FROM users");
});

bot.on("start", function() {
    bot.postMessageToChannel("general", "Slackbot - uses YELP API");
});

bot.on("error", (err) => console.log(err));

bot.on("message", (data) => {
    if (data.type !== "message") return;
    messageEventHandler(data.text);
});

function messageEventHandler(text) {
    // Nearby Address - list the name and address of any 5 nearby restaurants those within a 10,000 meter radius. Example usage: Nearby 135 Fennell Avenue West, Hamilton, Ontario
    if (text.includes("Nearby")) {
        var position = text.lastIndexOf("Nearby") + 6;
        var address = text.slice(position);
        nearbyAddress(address);
    }
    // Events Longitude Latitude - list the name, address and description of any 5 events within a 10,000 meter radius longitude and latitude position. Example usage: Events 79.8861W 43.2383N
    else if (text.includes("Events")) {
        var position = text.lastIndexOf("Events") + 6;
        var address = text.slice(position);
        cityEvents(address);
    }
    // Top Xnumber Address - list the name and address of the top Xnumber nearby restaurants with the highest YELP rating, nearby restaurants will be considered those within a 10,000 meter radius. Example usage: Top 10 135 Fennell Avenue West, Hamilton, Ontario
    else if (text.includes("Top")) {
        var first_position = text.lastIndexOf("Top") + 3;
        var half_slice = text.slice(first_position).trim();
        var second_position = half_slice.indexOf(" ");
        var number_of_restaurants = half_slice.slice(0, second_position);
        var address = half_slice.slice(second_position);
        topAddress(number_of_restaurants, address);
    }
    // Closest Xnumber Address - list the name and address of the closest Xnumber restaurants. Example usage: Closest 7 135 Fennell Avenue West, Hamilton, Ontario
    else if (text.includes("Closest")) {
        var first_position = text.lastIndexOf("Closest") + 7;
        var half_slice = text.slice(first_position).trim();
        var second_position = half_slice.indexOf(" ");
        var number_of_restaurants = half_slice.slice(0, second_position);
        var address = half_slice.slice(second_position);
        closest(number_of_restaurants, address);
    }
    // FindMe Category Address - return the name, address and rating of any restaurant matching the category given that is within 20,000 meters, category given should correspond to the alias field for example "coffee", "sushi", or "seafood". Example usage: FindMe sushi 135 Fennell Avenue West, Hamilton, Ontario
    else if (text.includes("FindMe")) {
        var first_position = text.lastIndexOf("FindMe") + 6;
        var half_slice = text.slice(first_position).trim();
        var second_position = half_slice.indexOf(" ");
        var category = half_slice.slice(0, second_position);
        var address = half_slice.slice(second_position);
        findme(category, address);
    }
    // Reviews RestaurantName Address - return the review excerpt text, reviewer username, rating, and link to the full review, for three reviews of the restaurant with the name RestaurantName closest to the supplied Address. Example usage: Reviews Spring Sushi 135 Fennell Avenue West, Hamilton, Ontario
    else if (text.includes("Reviews")) {
        var first_position = text.lastIndexOf("Reviews") + 7;
        var half_slice = text.slice(first_position).trim();
        var second_position = half_slice.match(/\d/);
        var restaurantName = half_slice.slice(0, second_position.index);
        var address = half_slice.slice(second_position.index);
        reviews(restaurantName, address);
    }
    // SearchByPhone PhoneNumber - return the name and address of any restaurants found with the supplied phone number PhoneNumber. Example usage: SearchByPhone 14165552222
    else if (text.includes("SearchByPhone")) {
        var position = text.lastIndexOf("SearchByPhone") + 13;
        var phone = text.slice(position);
        searchbyphone(phone.trim());
    }
    // StatusUpdate Status Message -  insert a record into an SQLite database with the exact same definition as Lab #1 (including a timestamp for when the message was received).
    else if (text.includes("StatusUpdate")) {
        var first_position = text.lastIndexOf("StatusUpdate") + 12;
        var half_slice = text.slice(first_position).trim();
        var second_position = half_slice.indexOf(" ");
        var _status = half_slice.slice(0, second_position);
        var message = half_slice.slice(second_position);
        var timestamp = new Date().getTime();
        status(_status, message.trim(), timestamp);
    }
}

function nearbyAddress(address) {
    let params = [{
        term: "restaurants",
        location: address,
        radius: parseInt("10000"),
        limit: "5",
    }, ];

    yelp
        .query("businesses/search", params)
        .then((data) => {
            let rawdata = JSON.parse(data);
            var reply = "";
            if (rawdata["error"]) {
                reply =
                    "Could not execute search, try specifying a more exact location.";
            } else {
                var businesses = rawdata["businesses"];
                if (businesses.length == 0) {
                    reply = "No nearby restaurants can be found";
                } else {
                    businesses.forEach((element) => {
                        reply +=
                            element["name"] +
                            " - " +
                            element["location"]["display_address"] +
                            "\n";
                    });
                }
            }
            bot.postMessageToChannel("general", reply);
        })
        .catch((err) => {
            // Failure
            console.log(err);
        });
}

function cityEvents(address) {
    let params = [{
        location: address,
        radius: parseInt("10000"),
        limit: "5",
    }, ];

    yelp
        .query("events", params)
        .then((data) => {
            let rawdata = JSON.parse(data);
            var reply = "";
            if (rawdata["error"]) {
                reply =
                    "The location you specified is not valid or could not be found. Try a more specific location.";
            } else {
                var events = rawdata["events"];
                if (events.length == 0) {
                    reply = "No close by events can be found";
                } else {
                    events.forEach((element) => {
                        reply +=
                            "Event Name: " +
                            element["name"] +
                            "\nAddress: " +
                            element["location"]["display_address"] +
                            "\nDescription: " +
                            element["description"] +
                            "\n\n";
                    });
                }
            }
            bot.postMessageToChannel("general", reply);
        })
        .catch((err) => {
            // Failure
            console.log(err);
        });
}

function topAddress(number_of_restaurants, address) {
    /* IMPORTANT NOTE: The rating sort is not strictly sorted by the rating value, but by an adjusted rating value that takes into account the number of ratings, similar to a Bayesian average. This is to prevent skewing results to businesses with a single review. */
    let params = [{
        term: "restaurants",
        location: address,
        sort_by: "rating",
        radius: parseInt("10000"),
        limit: number_of_restaurants,
    }, ];

    yelp
        .query("businesses/search", params)
        .then((data) => {
            let rawdata = JSON.parse(data);
            var reply = "";
            if (rawdata["error"]) {
                reply =
                    "The location you specified is not valid or could not be found. Try a more specific location.";
            } else {
                var businesses = rawdata["businesses"];
                if (businesses.length == 0) {
                    reply = "No nearby restaurants can be found";
                } else {
                    businesses.forEach((element) => {
                        reply +=
                            element["name"] +
                            " - " +
                            element["location"]["display_address"] +
                            " - " +
                            "\n";
                    });
                }
            }
            bot.postMessageToChannel("general", reply);
        })
        .catch((err) => {
            // Failure
            console.log(err);
        });
}

function closest(number_of_restaurants, address) {
    let params = [{
        term: "restaurants",
        location: address,
        sort_by: "distance",
        limit: number_of_restaurants,
    }, ];

    yelp
        .query("businesses/search", params)
        .then((data) => {
            let rawdata = JSON.parse(data);
            var reply = "";
            if (rawdata["error"]) {
                reply =
                    "The location you specified is not valid or could not be found. Try a more specific location.";
            } else {
                var businesses = rawdata["businesses"];
                if (businesses.length == 0) {
                    reply = "No nearby restaurants can be found";
                } else {
                    businesses.forEach((element) => {
                        reply +=
                            element["name"] +
                            " - " +
                            element["location"]["display_address"] +
                            "\n";
                    });
                }
            }
            bot.postMessageToChannel("general", reply);
        })
        .catch((err) => {
            // Failure
            console.log(err);
        });
}

function findme(category, address) {
    let params = [{
        term: "restaurants",
        location: address,
        sort_by: "distance",
        radius: parseInt("20000"),
        categories: category,
    }, ];
    yelp
        .query("businesses/search", params)
        .then((data) => {
            let rawdata = JSON.parse(data);
            var reply = "";
            if (rawdata["error"]) {
                reply =
                    "The location you specified is not valid or could not be found. Try a more specific location.";
            } else {
                var businesses = rawdata["businesses"];
                if (businesses.length == 0) {
                    reply = `No ${category} restaurant can be found`;
                } else {
                    businesses.forEach((element) => {
                        reply +=
                            element["name"] +
                            " - " +
                            element["location"]["display_address"] +
                            " - " +
                            element["rating"] +
                            "\n";
                    });
                }
            }
            bot.postMessageToChannel("general", reply);
        })
        .catch((err) => {
            // Failure
            console.log(err);
        });
}

function reviews(restaurantName, address) {
    let params = [{
        term: restaurantName,
        location: address,
        limit: "1",
    }, ];
    yelp
        .query("businesses/search", params)
        .then((data) => {
            let rawdata = JSON.parse(data);
            var reply = "";
            if (rawdata["error"]) {
                reply =
                    "The location you specified is not valid or could not be found. Try a more specific location.";
            } else {
                var businesses = rawdata["businesses"];
                if (businesses[0]["name"].trim() == params[0]["term"].trim()) {
                    var id = businesses[0]["id"];
                    let filterReviews = [{
                        limit: "3",
                    }, ];
                    yelp
                        .query(`businesses/${id}/reviews`, filterReviews)
                        .then((data) => {
                            let rawdata = JSON.parse(data);
                            var reviews = rawdata["reviews"];
                            if (reviews.length == 0) {
                                reply = "No reviews found for this restaurant";
                                bot.postMessageToChannel("general", reply);
                            } else {
                                reply =
                                    "Restaurant Name: " +
                                    businesses[0]["name"] +
                                    "\n" +
                                    "Reviews: \n";
                                reviews.forEach((element) => {
                                    reply +=
                                        element["user"]["name"] +
                                        " - " +
                                        element["text"] +
                                        " - " +
                                        element["rating"] +
                                        " - " +
                                        element["url"] +
                                        "\n\n";
                                });
                                bot.postMessageToChannel("general", reply);
                            }
                        })
                        .catch((err) => {
                            // Failure
                            console.log(err);
                        });
                } else {
                    reply = `${params[0]["term"].trim()} cannot be found`;
                    bot.postMessageToChannel("general", reply);
                }
            }
        })
        .catch((err) => {
            // Failure
            console.log(err);
        });
}

function searchbyphone(phone) {
    let params = [{
        phone: phone,
    }, ];
    yelp
        .query("businesses/search/phone", params)
        .then((data) => {
            let rawdata = JSON.parse(data);
            var reply = "";
            if (rawdata["error"]) {
                reply = "Check the phone number entered!!";
            } else {
                if (rawdata["total"] == 0) {
                    reply = `No restaurant with phone number ${params[0]["phone"]} can be found`;
                } else {
                    var businesses = rawdata["businesses"];
                    businesses.forEach((element) => {
                        reply +=
                            element["name"] +
                            " - " +
                            element["location"]["display_address"] +
                            "\n";
                    });
                }
            }
            bot.postMessageToChannel("general", reply);
        })
        .catch((err) => {
            // Failure
            console.log(err);
        });
}

function status(_status, message, timestamp) {
    db.all(
        `INSERT INTO users ( status, message, timestamp) VALUES("${_status}", "${message}","${timestamp}");`,
        (err, row) => {
            if (err) {
                return res.send(err.message);
            }
        }
    );

    bot.postMessageToChannel(
        "general",
        "Status Update message inserted into database"
    );
}