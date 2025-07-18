import express from 'express'; //Import express
import cors from 'cors'; //Import cors para conectar frontend con backend

import { join, dirname } from 'path'; //Import dirname
import { fileURLToPath } from 'url'; //Import fileURLToPath

import routes from "./routes/indexroutes.js"//Importin the routes
import session from 'express-session'; 
import passport from 'passport';
import dotenv from 'dotenv'; //Import dotenv to use environment variables



import SequelizeStore from 'connect-session-sequelize';
import sequelize from './databases/connection.js'; //Import sequelize instance

//Fetchin environment variables
dotenv.config(); //Load environment variables from .env file

//Initialization express
const app = express(); 

console.log('La direccion del frontend es '+ process.env.FRONTEND_URL)

//Configure cors to allow requests from localhost:3000
app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",  // Allow requests from this origin
    credentials: true, //Allow credentials
}));

// Configura el almacenamiento de sesiones con Sequelize
const SessionStore = SequelizeStore(session.Store);
const sequelizeStore = new SessionStore({
    db: sequelize,
});

// Sincroniza el modelo de sesiones con la base de datos

sequelizeStore.sync();


//Set port to 3000 or use the port from the environment variable
const port = process.env.PORT || 3000; 

//Get the directory name of the current module
const __dirname = dirname(fileURLToPath(import.meta.url)); 

//Middleware
app.use(express.json()); //look requests where the Content-Type header matches the type option.
//app.use(cookieParser("mysignedcookie")); //Parse cookies in the request before our routes
app.use(
    session({
        secret: process.env.SESSION_SECRET || "erick the dev",
        saveUninitialized: false,
        resave: false,
        cookie: {
            maxAge: 24 * 60 * 60 * 1000, // 1 día
        },
        store: sequelizeStore, // Usa SequelizeStore como almacenamiento
    })
);

//app.set("views", join(__dirname, "views")); //Set views directory
//app.set("view engine", "ejs"); //Set view engine to ejs

app.use(passport.initialize()); //Initialize passport
app.use(passport.session());//Initialize passport session atach a user object to session
app.use(routes) //Defining the routes that came from the routes file

//app.use(express.urlencoded({ extended: true }));//If we are working with forms, we need to parse the body of the request
// Public files use for everyone
//app.use(express.static(join(__dirname, "public"))); //Set public directory


//Run Server
app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});

//Routes
app.get("/", (req, res)=>{

    res.send({mensaje: "Estoy en express"}); //Send a json response
})

/*app.get("/every", (req,res) => {
    res.sendFile("every.html", { root: join(__dirname, "public") }); //Send every.html file
})*/
