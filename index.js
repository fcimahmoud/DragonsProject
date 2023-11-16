
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const moment = require('moment');
const bcrypt = require('bcrypt');
const session = require('express-session');
const { log, Console } = require('console');
// Connect to MongoDB database
mongoose.connect('mongodb+srv://mahmoudahmedhussien112:Strongman112233@nudels.xe6nxto.mongodb.net/?retryWrites=true&w=majority', { useNewUrlParser: true, useUnifiedTopology: true })
.then(()=>{console.log("Done");})
.catch(()=>{console.log("Error");});

// Define the 'Zone' schema
const zoneSchema = new mongoose.Schema({
	location: { type: String, required: true },
	needsMaintenance: { type: Boolean, default: true },
	lastMaintenance: { type: Date, default: null },
	carnivores: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Dragon' }],
});

// Define the 'Dragon' schema
const dragonSchema = new mongoose.Schema({
	name: { type: String, required: true },
	species: { type: String, required: true },
	gender: { type: String, required: true },
	id: { type: Number, required: true, unique: true },
	digestionPeriod: { type: Number, required: true },
	herbivore: { type: Boolean, required: true },
	lastFed: { type: Date, default: null },
});

// Define the 'User' schema
const userSchema = new mongoose.Schema({
	username: { type: String, required: true, unique: true },
	password: { type: String, required: true },
});

// Create 'Zone', 'Dragon', and 'User' models
const Zone = mongoose.model('Zone', zoneSchema);
const Dragon = mongoose.model('Dragon', dragonSchema);
const User = mongoose.model('User', userSchema);

// Create Express app and use middleware for session management and user authentication
const app = express();
app.use(bodyParser.json());
app.use(session({
	secret: 'yourSecretKey',
	resave: false,
	saveUninitialized: true,
	cookie: { maxAge: 60 * 60 * 1000 } // One hour in milliseconds
}));

// Middleware to check if user is authenticated before accessing protected routes
function isAuthenticated(req, res, next) {
	if (!req.session.isLoggedIn) {
		res.status(401).send('Unauthorized');
		return;
	}

	next();
}

// API endpoint to handle user login
app.post('/login', async (req, res) => {
	const { username, password } = req.body;
	const user = await User.findOne({ username });

	if (!user) {
		res.status(401).send('Invalid username or password');
		return;
	}

	const isValidPassword = await bcrypt.compare(password, user.password);

	if (!isValidPassword) {
		res.status(401).send('Invalid username or password');
		return;
	}

	req.session.isLoggedIn = true;
	req.session.user = user;
	res.send('Login successful');
});

// API endpoint to handle NUDLS™ events
app.post('/events', async (req, res) => {
	const event = req.body;

	switch (event.kind) {
		case 'dragon_added':
			await handleDragonAdded(event);
			break;
		case 'dragon_removed':
			await handleDragonRemoved(event);
			break;
		case 'dragon_location_updated':
			await handleDragonLocationUpdated(event);
			break;
		case 'dragon fed':
			await handleDragonFed(event);
			break;
		case 'maintenance performed':
			await handleMaintenancePerformed(event);
			break;
		default:
			res.status(400).send('Invalid event type');
			break;
	}

	res.status(200).send('Event processed successfully');
});

// Function to handle 'dragon_added' event
async function handleDragonAdded(event) {
	const dragon = new Dragon({
		name: event.name,
		species: event.species,
		gender: event.gender,
		id: event.id,
		digestionPeriod: event.digestion_period_is_hours,
		herbivore: event.herbivore,
	});

	await dragon.save();
}

// Function to handle 'dragon_removed' event
async function handleDragonRemoved(event) {
	const dragon = await Dragon.findOneAndDelete({ id: event.id });

	if (!dragon) {
		console.error(`Dragon with id ${event.id} not found`);
	}
}

// Function to handle 'dragon_location_updated' event
async function handleDragonLocationUpdated(event) {
	const dragon = await Dragon.findById(event.dragon_id);

	if (!dragon) {
		console.error(`Dragon with id ${event.dragon_id} not found`);
		return;
	}

	dragon.location = event.location;
	await dragon.save();

	updateZoneStatus(dragon.location);
}

// Function to handle 'dragon fed' event
async function handleDragonFed(event) {
	const dragon = await Dragon.findById(event.id);

	if (!dragon) {
	console.error(`Dragon with id ${event.id} not found`);
	return;
	}

	dragon.lastFed = event.time;
	await dragon.save();
}

// Function to handle 'maintenance performed' event
async function handleMaintenancePerformed(event) {
	const zone = await Zone.findOne({ location: event.location });
	if (!zone) {
		console.error(`Zone with location ${event.location} not found`);
		return;
	}

	zone.lastMaintenance = event.time;
	zone.needsMaintenance = false;
	await zone.save();
}	  

// API endpoint to get a list of all zones and their statuses
app.get('/zones', isAuthenticated, async (req, res) => {
	const zones = await Zone.find();
	const arrZoneStatuses = [];

	for (const zone of zones) {
		const zoneStatus = await getZoneStatus(zone);
		arrZoneStatuses.push(zoneStatus);
	}

	res.json(arrZoneStatuses);
});

// API endpoint to retrieve details for a specific zone
app.get('/zones/:zoneId', isAuthenticated, async (req, res) => {
	const zone = await Zone.findById(req.params.zoneId);

	if (!zone) {
		res.status(404).send('Zone not found');
		return;
	}

	const zoneStatus = await getZoneStatus(zone);
	res.json(zoneStatus);
});

// Function to check if a zone is safe to enter
async function isZoneSafe(zone) {
	const dragons = await Zone.find({ location: zone });

	if (!dragons.length) {
		return true;
	}

	for (const dragon of dragons) {
		if (!dragon.herbivore && !isDigesting(dragon)) {
			return false;
		}
	}

	return true;
}

// Function to check if a dragon is currently digesting
function isDigesting(dragon) {
	const now = moment();
	const lastFed = moment(dragon.lastFed);
	const digestionPeriod = dragon.digestionPeriod * 60 * 60 * 1000; // Convert digestion period from hours to milliseconds

	return now.isBefore(lastFed.add(digestionPeriod));
}

// Function to get the status of a zone
async function getZoneStatus(zone) {
	const isSafe = await isZoneSafe(zone);
	const needsMaintenance = zone.needsMaintenance;

	return {
		location: zone.location,
		safeToEnter: isSafe,
		needsMaintenance,
	};
}

// Start the Express app
app.listen(3000, () => console.log('Server started on port 3000'));
