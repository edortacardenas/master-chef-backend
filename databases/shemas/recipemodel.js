import { DataTypes } from "sequelize";
import sequelize from "../connection.js"; //Import sequelize instance



const Recipe = sequelize.define(
    "Recipe",
    {
        title: {
            type: DataTypes.STRING,
            unique: true,
            allowNull: false,
            validate: {
                len: [3, 90], // Name must be between 3 and 50 characters
            },
        },
        ingredients: {
            type: DataTypes.ARRAY(DataTypes.STRING),
            allowNull: false,
        },
        
        instructions:{
            type: DataTypes.TEXT,
            allowNull: false,
        },
    },
    {
        tableName: "recipes", // Especifica el nombre de la tabla
    }
)


// Export the User model
export default Recipe;