const pool = require("../utils/db");
const cloudinary = require('../utils/cloudinaryConfig');


const createTripHandler = async (req, res) => {
    console.log("Finally Inside router ");
    const {
      dates,
      destinationMarker,
      locationMarker,
      price,
      seats,
      stops,
      time,
      userID,
      vehicleID,
      sourceName, 
      destinationName 
    } = req.body;
  
    if (!dates || !Array.isArray(dates) || dates.length === 0) {
      return res.status(400).json({ error: 'Invalid or missing dates array' });
    }
  
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
  
      const driverQuery = 'SELECT driverid FROM drivers WHERE userid = $1';
      const driverResult = await client.query(driverQuery, [userID]);
      if (driverResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Driver not found for the given userID' });
      }
      const driverID = driverResult.rows[0].driverid;
  
      for (const tripDate of dates) {
        const query = `
          INSERT INTO trips (
            driverid, vehicleid, numberofpassengers, numberofstops,
            startlocation, destinationlocation, price, triptime,
            tripdate, totalseats, overallrating, sourcename, destinationname
          ) VALUES (
            $1, $2, 0, $3, 
            ST_SetSRID(ST_MakePoint($4, $5), 4326),
            ST_SetSRID(ST_MakePoint($6, $7), 4326),
            $8, $9, $10, $11, 5, $12, $13
          )
        `;
  
        const values = [
          driverID, 
          vehicleID,
          parseInt(stops, 10),
          locationMarker.longitude,
          locationMarker.latitude,
          destinationMarker.longitude,
          destinationMarker.latitude,
          parseInt(price, 10),
          time,
          tripDate,
          parseInt(seats, 10),
          sourceName, 
          destinationName 
        ];
  
        await client.query(query, values);
      }
  
      await client.query('COMMIT');
      res.status(201).json({ message: 'Trips created successfully' });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating trips:', error);
      res.status(500).json({ error: 'An error occurred while creating trips' });
    } finally {
      client.release();
    }
  };
  


const registerVehicle = async (req, res) => {
    try {
        const { userID, vehicleName, vehicleColor, vehicleNumber, vehicleAverage } = req.body;

        // Check if the user exists
        const userCheck = await pool.query("SELECT * FROM Users WHERE UserID = $1", [userID]);
        if (userCheck.rowCount === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        // Check if the user is a driver
        const driverCheck = await pool.query("SELECT DriverID FROM Drivers WHERE UserID = $1", [userID]);
        let driverID;

        if (driverCheck.rowCount === 0) {
            // If user is not a driver, insert them into Drivers table
            const newDriver = await pool.query(
                "INSERT INTO Drivers (UserID) VALUES ($1) RETURNING DriverID",
                [userID]
            );
            await pool.query(
                `UPDATE Users SET IsDriver = TRUE WHERE UserID = $1`,
                [userID]
            );
            driverID = newDriver.rows[0].driverid;
        } else {
            driverID = driverCheck.rows[0].driverid;
        }

        // Register the vehicle
        const vehicleInsert = await pool.query(
            "INSERT INTO Vehicles (VehicleName, VehicleColor, VehicleNumber, VehicleAverage, DriverID) VALUES ($1, $2, $3, $4, $5) RETURNING *",
            [vehicleName, vehicleColor, vehicleNumber, vehicleAverage, driverID]
        );

        res.status(201).json({ message: "Vehicle registered successfully", vehicle: vehicleInsert.rows[0] });

    } catch (error) {
        console.error("Error registering vehicle:", error);
        res.status(500).json({ message: "Server error" });
    }
};

const acceptPassengerReq = async (req, res) => {
    const client = await pool.connect();

    try {
        const { requestId, tripId } = req.body;

        await client.query('BEGIN');

        // Check available slots
        const { rows } = await client.query(
            `SELECT NumberOfPassengers, totalseats FROM Trips WHERE TripID = $1 AND status = 'upcoming'`,
            [tripId]
        );

        if (rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Trip not found' });
        }

        console.log(rows[0])

        const availableSlots = rows[0].totalseats - rows[0].numberofpassengers ;
        if (availableSlots <= 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: 'No available slots for this trip' });
        }

        // Update request status to ACCEPTED
        const updateRequest = await client.query(
            `UPDATE TripRequests 
             SET Status = 'ACCEPTED' 
             WHERE RequestID = $1 AND TripID = $2 AND Status = 'PENDING' 
             RETURNING PassengerID`,
            [requestId, tripId]
        );

        if (updateRequest.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Request not found or already processed' });
        }

        const passengerId = updateRequest.rows[0].passengerid;

        // Insert into TripPassengers table
        await client.query(
            `INSERT INTO TripPassengers (TripID, PassengerID) 
             VALUES ($1, $2)`,
            [tripId, passengerId]
        );

        // Increase passenger count
        await client.query(
            `UPDATE Trips 
             SET NumberOfPassengers = NumberOfPassengers + 1 
             WHERE TripID = $1`,
            [tripId]
        );

        await client.query('COMMIT');

        res.status(200).json({
            message: 'Passenger request accepted',
            passengerId,
            tripId,
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error accepting passenger request:', err);
        res.status(500).json({ message: 'Server error' });
    } finally {
        client.release();
    }
};

const rejectPassengerReq = async (req, res) => {
    try {
        const { requestId, tripId } = req.body;

        const updateResult = await pool.query(
            `UPDATE TripRequests 
             SET Status = 'REJECTED' 
             WHERE RequestID = $1 AND TripID = $2 
             RETURNING *`,
            [requestId, tripId]
        );

        if (updateResult.rowCount === 0) {
            return res.status(404).json({ message: 'Request not found or already processed' });
        }

        // No need to update available slots since rejection doesn't affect it
        res.status(200).json({
            message: 'Passenger request rejected',
            requestId,
            tripId,
        });

    } catch (err) {
        console.error('Error rejecting passenger request:', err);
        res.status(500).json({ message: 'Server error' });
    }
};


const tripCompleted = async (req, res) => {
    try {
        const userId = req.user; 
        console.log(userId)
        const { tripId } = req.params; // tripId from URL

        // Check if the user is the driver of the trip
        const driverCheck = await pool.query(
            `SELECT TripID FROM Trips WHERE TripID = $1 AND status = 'ongoing' AND DriverID = 
             (SELECT DriverID FROM Drivers WHERE UserID = $2)`,
            [tripId, userId]
        );

        if (driverCheck.rows.length === 0) {
            return res.status(403).json({ message: "Only the driver can complete this trip" });
        }

        // Update trip status to 'completed'
        await pool.query(
            `UPDATE Trips SET Status = 'completed' WHERE TripID = $1`,
            [tripId]
        );

        res.json({ message: "Trip marked as completed successfully" });

    } catch (err) {
        console.error("Error completing trip:", err);
        res.status(500).json({ message: "Server error" });
    }
};

const tripStart = async (req, res) => {
    try {
        const userId = req.user; 
        const { tripId } = req.params; 

        console.log("TripID:",tripId);
        console.log("UserID:",userId)

        // Check if the user is the driver of the trip
        const driverCheck = await pool.query(
            `SELECT TripID FROM Trips WHERE TripID = $1 AND status = 'upcoming' AND DriverID = 
             (SELECT DriverID FROM Drivers WHERE UserID = $2)`,
            [tripId, userId]
        );

        if (driverCheck.rows.length === 0) {
            return res.status(403).json({ message: "Incorrect information supplied or action not authorized" });
        }

        // Update trip status to 'ongoing'
        await pool.query(
            `UPDATE Trips SET Status = 'ongoing' WHERE TripID = $1`,
            [tripId]
        );

        res.json({ message: "Trip marked as ongoing successfully" });

    } catch (err) {
        console.error("Error completing trip:", err);
        res.status(500).json({ message: "Server error" });
    }
};

const getTripRequests = async (req, res) => {
    try {
        const { tripId } = req.params;
        const userId = req.user;

        // Check if the trip exists and was created by the requesting driver
        const tripCheck = await pool.query(
            `SELECT t.TripID 
             FROM Trips t
             JOIN Drivers d ON t.DriverID = d.DriverID
             WHERE t.TripID = $1 AND d.UserID = $2`,
            [tripId, userId]
        );

        if (tripCheck.rowCount === 0) {
            return res.status(403).json({ message: 'You are not authorized to view these trip requests' });
        }

        const result = await pool.query(
            `SELECT 
                tr.RequestID,
                tr.Status,
                u.UserID,
                u.username,
                u.Email
            FROM TripRequests tr
            JOIN Users u ON tr.PassengerID = u.UserID
            WHERE tr.TripID = $1`,
            [tripId]
        );

        if (result.rowCount === 0) {
            return res.status(200).json({ message: 'No requests found for this trip', tripRequests: [] });
        }

        res.status(200).json({
            tripId,
            tripRequests: result.rows.map(row => ({
                requestId: row.requestid,
                status: row.status,
                passenger: {
                    userId: row.userid,
                    username: row.username,
                    email: row.email
                }
            }))
        });

    } catch (err) {
        console.error('Error fetching trip requests:', err);
        res.status(500).json({ message: 'Server error' });
    }
};


const uploadVehiclePicture = async (req, res) => {
    try {
      const { vehicleId } = req.body;
  
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
  
      // Wrap cloudinary upload_stream in a Promise
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: 'vehicle_pictures' },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );
  
        // Send the buffer to Cloudinary
        uploadStream.end(req.file.buffer);
      });
  
      // Store the image URL in Postgres
      const query = `UPDATE vehicles SET vehicle_photo = $1 WHERE vehicleid = $2`;
      await pool.query(query, [result.secure_url, vehicleId]);
  
      console.log(result.secure_url);
  
      return res.status(200).json({ message: 'Vehicle picture updated', url: result.secure_url });
  
    } catch (err) {
      if (!res.headersSent) {
        return res.status(500).json({ error: err.message });
      }
    }
  };

  const getUserIdhandler = async (req, res) => {
    const { driverId } = req.params;

    try {
        const result = await pool.query(
            `SELECT userid
            from drivers
            WHERE driverid = $1`,
            [driverId]
        )

        if (result.rowCount === 0) {
            return res.status(200).json({ message: 'No driver exists with this ID' });
        }

        return res.status(200).json({ userId: result.rows[0].userid });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
  };




module.exports = { createTripHandler, registerVehicle, acceptPassengerReq, rejectPassengerReq, tripCompleted, getTripRequests, tripStart, uploadVehiclePicture, getUserIdhandler };