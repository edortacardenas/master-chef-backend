import { Sequelize } from 'sequelize';
import pg from 'pg'; // Add this line

const dbConnectionString = process.env.DATABASE_URL;

console.log('Intentando conectar con DATABASE_URL:', dbConnectionString);
console.log(pg.Connection); // Log the pg.Connection object to see if it's defined

if (!dbConnectionString) {
    console.error('Error: La variable de entorno DATABASE_URL no está configurada.');
    // Considera salir o manejar el error de forma más robusta si es crítico
    process.exit(1);
  }
  
// Configura Sequelize con PostgreSQL
const sequelize = new Sequelize(process.env.DATABASE_URL , {
    dialect: 'postgres',
    logging: false, // Desactiva el logging de consultas SQL
    
});

// Sincroniza los modelos con la base de datos
sequelize
    .sync({ force: false }) // Cambia a `true` si quieres recrear las tablas (¡esto elimina los datos existentes!)
    .then(() => {
        console.log('Base de datos sincronizada correctamente');
    })
    .catch((error) => {
        console.error('Error al sincronizar la base de datos:', error);
    });

sequelize
    .authenticate()
    .then(() => console.log('Conexión a PostgreSQL exitosa'))
    .catch((error) => console.error('Error al conectar a PostgreSQL:', error));

export default sequelize;