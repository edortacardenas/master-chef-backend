import { Router } from "express";
//Importing the recipeRouter
import recipesRouter from "./recipe.js";//tienes q poner .js para q tome la ruta adecuada

const router = Router()

//Registry router and add the prefix /api
router.use("/api", recipesRouter) //Registry recipesRouter and add the prefix /api


export default router;