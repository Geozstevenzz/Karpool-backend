const pool = require("../utils/db");

const getTripsHandler = async (req , res) => {
    try {
        const { locationMarker, destinationMarker, time, date } = req.body;
    
        const { latitude: startLat, longitude: startLon } = locationMarker;
        const { latitude: destLat, longitude: destLon } = destinationMarker;
    
        // Define constants
        const distanceThreshold = 5 * 1000; // 5 km in meters
        const timeOffset = '1 hour'; // +/- 1 hour
        const averageSpeed = 40; // Average driving speed in km/h (adjust as needed)
    
        const query = `
          SELECT 
            trips.tripid,
            trips.driverid,
            trips.vehicleid,
            trips.numberofpassengers,
            trips.numberofstops,
            trips.overallrating,
            trips.price,
            trips.triptime,
            trips.tripdate,
            trips.totalseats,
            ST_X(trips.startlocation) AS startlatitude,
            ST_Y(trips.startlocation) AS startlongitude,
            ST_X(trips.destinationlocation) AS destinationlatitude,
            ST_Y(trips.destinationlocation) AS destinationlongitude,
            ST_DistanceSphere(startlocation, ST_SetSRID(ST_Point($1, $2), 4326)) AS distance,
            users.username,
            users.profile_photo,
            vehicles.vehiclename,
            vehicles.vehiclecolor,
            vehicles.vehiclenumber,
            vehicles.vehicleaverage
          FROM trips
          JOIN drivers ON trips.driverid = drivers.driverid
          JOIN users ON drivers.userid = users.userid
          JOIN vehicles ON trips.vehicleid = vehicles.vehicleid
          WHERE 
            ST_DistanceSphere(startlocation, ST_SetSRID(ST_Point($1, $2), 4326)) <= $3
            AND ST_DistanceSphere(destinationlocation, ST_SetSRID(ST_Point($4, $5), 4326)) <= $3
            AND trips.tripdate = $6
            AND trips.triptime BETWEEN ($7::time - $8::interval) AND ($7::time + $8::interval)
          LIMIT 5;
        `;
    
        const values = [
          startLon,
          startLat,
          distanceThreshold,
          destLon,
          destLat,
          date,
          time,
          timeOffset,
        ];
    
        const result = await pool.query(query, values);
    
        const formattedTrips = result.rows.map(row => {
            const distanceInKm = row.distance / 1000; // Convert distance to kilometers
            const estimatedTimeInHours = distanceInKm / averageSpeed;
            const estimatedTimeInMinutes = Math.round(estimatedTimeInHours * 60);
        
            return {
                tripid: row.tripid,
                driverid: row.driverid,
                vehicleid: row.vehicleid,
                numberofpassengers: row.numberofpassengers,
                numberofstops: row.numberofstops,
                overallrating: row.overallrating,
                price: row.price,
                triptime: row.triptime,
                tripdate: row.tripdate,
                totalseats: row.totalseats,
                startlocation: {
                latitude: row.startlatitude,
                longitude: row.startlongitude,
                },
                destinationlocation: {
                latitude: row.destinationlatitude,
                longitude: row.destinationlongitude,
                },
                distance: distanceInKm.toFixed(2), // Distance in km rounded to 2 decimal places
                estimatedTime: `${estimatedTimeInMinutes} minutes`, // Estimated time in minutes
                username: row.username,
                profile_photo: row.profile_photo,
                vehiclename: row.vehiclename,
                vehiclecolor: row.vehiclecolor,
                vehiclenumber: row.vehiclenumber,
                vehicleaverage: row.vehicleaverage,
            };
        });
    
        res.status(200).json(formattedTrips);
    } catch (error) {
        console.error('Error fetching trips:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const tripJoinReq = async (req, res) => {
  try {
      const { tripId, passengerId } = req.body;

      const result = await pool.query(
          `INSERT INTO TripRequests (TripID, PassengerID, Status) 
           VALUES ($1, $2, 'PENDING') RETURNING RequestID`,
          [tripId, passengerId]
      );

      res.json({ message: "Trip join request sent", requestId: result.rows[0].requestid });

  } catch (err) {
      console.error("Error requesting to join trip:", err);
      res.status(500).json({ message: "Server error" });
  }
};

module.exports = { getTripsHandler, tripJoinReq }