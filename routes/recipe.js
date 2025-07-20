import { Router } from 'express';
import  Recipe  from "../databases/shemas/recipemodel.js"; //Import the user shema
// Node.js v18+ tiene fetch globalmente. Si usas una versión anterior, necesitarías un polyfill como 'node-fetch'.
import dotenv from 'dotenv';
import { validationResult, matchedData, checkSchema } from "express-validator";//Import express-validator
import { createRecipeValidationShema, 
    chatCompletionValidationSchema, 
    //deleteRecipeByNameValidationSchema,
    getRecipesByIngredientsValidationSchema, 
    getRecipeByNameValidationSchema 
} from '../utils/validationShemas.js';

import { Op, fn, col, where } from 'sequelize'; // Import Sequelize operators and functions
dotenv.config(); // Carga las variables de entorno del archivo .env
import { InferenceClient } from "@huggingface/inference";

const hf = new InferenceClient(process.env.HF_ACCESS_TOKEN)// Inicializa el cliente de Hugging Face con el token de acceso

// El token de acceso a Hugging Face se usará en la cabecera de la petición fetch

const SYSTEM_PROMPT_BACKEND = `You are a culinary assistant. Your task is to generate a recipe based on a list of ingredients provided by the user.

**Core Requirements:**
1.  **Ingredient Usage:**
    *   Prioritize using the ingredients provided by the user. You can use some or all of them.
    *   If necessary, you may include a few common additional ingredients. Keep these additions minimal.
2.  **Output Format (Strict Markdown):**
    Your entire response must be in Markdown. The recipe must be structured with the following exact H2 Markdown headers:
    *   \`## Title\`
        *   (Followed by the recipe name on the next line)
    *   \`## Ingredients\`
        *   (Followed by a list of ingredients. Use Markdown list format, e.g., \`- 1 cup flour\` or \`* 1 egg\`)
    *   \`## Instructions\`
        *   (Followed by step-by-step instructions. Use Markdown numbered or bulleted list format, e.g., \`1. Preheat oven.\` or \`- Mix dry ingredients.\`)

Example of expected structure:
\`\`\`markdown
## Title
Delicious Apple Pie

## Ingredients
- 2 cups apples, sliced
- 1 cup sugar
- ...

## Instructions
1. Preheat oven to 375°F.
2. Combine apples and sugar.
- ...
\`\`\`
Ensure your response strictly follows this Markdown structure, especially the \`## Title\`, \`## Ingredients\`, and \`## Instructions\` headers, for correct parsing.
Please provide the recipe in English.`;



const router = Router()

console.log("Iniciando el router de recetas...")
// Endpoint específico para chat completion de recetas con validación
router.post(
    '/hf-chat-completion',
    checkSchema(chatCompletionValidationSchema), // Aplicar el esquema de validación
    async (req, res) => {
    const errors = validationResult(req);
    console.log("Entro al endpoint hf-chat-completion")
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    
    try {
        const { ingredientsString } = matchedData(req); // Usar datos validados
        //const model ="mistralai/Mistral-7B-Instruct-v0.3"; // Modelo a utilizar
        const max_tokens = 1024; // Máximo de tokens para la respuesta
        

        if (!ingredientsString) {
            return res.status(400).json({ message: "Falta 'ingredientsString' en el cuerpo de la solicitud." });
        }

       const apiResponse = await hf.chatCompletion({
           model: "mistralai/Mistral-7B-Instruct-v0.3",
           messages: [
               { role: "system", content: SYSTEM_PROMPT_BACKEND },
               { role: "user", content: `I have ${ingredientsString}. Please give me a recipe you'd recommend I make!` },
           ],
           max_tokens: max_tokens,
       });

       const recipe = apiResponse.choices[0].message.content;

        if (!apiResponse.ok) {
            const errorBodyText = apiResponse.choices[0].message.content || "No error details provided";
            const hasRecipeContent = errorBodyText.trim().startsWith("## Title"); // Basic content check

            // Modified error handling with content check
            if (hasRecipeContent) {
                console.warn("Hugging Face API returned an error status but included recipe content:", { status: apiResponse.status, data: apiResponse });
                // Treat as a partial success, returning the content with a warning for frontend
                return res.status(200).json({ recipe: errorBodyText, warning: "La API de Hugging Face indicó un error pero devolvió una receta parcial." });
            } else {
                // Log the FULL apiResponse object for true error cases
                console.error("Error from Hugging Face API (no usable content):", { status: apiResponse.status, data: apiResponse });

                // (Rest of your original error handling logic remains mostly the same, but with the "Unknown" fallback improved)
                // Si el error es específicamente un 402 de Hugging Face (créditos excedidos)
                if (apiResponse.status === 402) { // This might still need adjustment
                    return res.status(402).json({ message: `La API de Hugging Face devolvió un error ${apiResponse.status || 'Unknown'}: ${errorBodyText}` });
                }

                return res.status(502).json({
                    message: `Error al comunicarse con el servicio de IA (Hugging Face): ${apiResponse.status || 'Unknown'}. Detalles: ${errorBodyText.substring(0, 500)}`
                });
            }
        }

       res.json({ recipe });
   } catch (error) {
        console.error("Error general al procesar la solicitud de chat completion:", error.message);
        // Asegurarse de no enviar cabeceras si ya se envió una respuesta (por ejemplo, desde el bloque !apiResponse.ok)
        if (!res.headersSent) {
            res.status(500).json({ message: "Error interno del servidor al procesar la solicitud de chat completion." });
        }
   }
});

//Endpoint para guardar la receta en la base de datos
router.post(
    '/recipes',
    checkSchema(createRecipeValidationShema), // Aplicar el esquema de validación como middleware
    async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const validatedData = matchedData(req); // Obtener solo los datos validados y sanitizados

        const newRecipe = await Recipe.create({
            title: validatedData.title,
            ingredients: validatedData.ingredients,
            instructions: validatedData.instructions,
        });

        res.status(201).json({ message: "Receta guardada exitosamente" });
    } catch (error) {
        console.error("Error al guardar la receta:", error);
        res.status(500).json({ message: "Error interno del servidor al guardar la receta.", error: error.message });
    }
});

// Endpoint para obtener recetas de la base de datos filtrando por palabras en el nombre
router.get(
    '/recipes/by-name/:title',
    checkSchema(getRecipeByNameValidationSchema),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        try {
            const { title: searchPhrase } = matchedData(req); // Get the validated title parameter, rename for clarity

            // Normalize and split search phrase into words
            // Filter out short words (e.g., <= 1 character) and empty strings from split
            const searchWords = searchPhrase
                .toLowerCase()
                .split(/\s+/) // Split by one or more spaces, handles multiple spaces
                .filter(word => word.length > 1); // Keep words with more than 1 character

            if (searchWords.length === 0) {
                return res.status(400).json({ message: 'Search phrase must contain at least one meaningful word (more than 1 character).' });
            }

            // Build OR conditions for each search word, case-insensitive using LOWER()
            const orConditions = searchWords.map(word =>
                // Creates a condition like: LOWER("title") LIKE '%word%'
                where(fn('LOWER', col('title')), {
                    [Op.like]: `%${word}%`
                })
            );

            // Fetch candidate recipes that match at least one of the search words
            const candidateRecipes = await Recipe.findAll({
                where: {
                    [Op.or]: orConditions
                }
            });

            if (!candidateRecipes || candidateRecipes.length === 0) {
                return res.status(404).json({ message: 'No recipes found matching any of the keywords.' });
            }

            // Filter candidates to find those containing "most" of the search words
            // "Most" means strictly more than 50% of the words
            const minMatchCount = Math.floor(searchWords.length / 2) + 1;

            const finalRecipes = candidateRecipes.filter(recipe => {
                const recipeTitleLower = recipe.title.toLowerCase();
                let currentMatchCount = 0;
                for (const sword of searchWords) { // searchWords are already lowercase
                    if (recipeTitleLower.includes(sword)) {
                        currentMatchCount++;
                    }
                }
                return currentMatchCount >= minMatchCount;
            });

            if (finalRecipes.length === 0) {
                return res.status(404).json({ message: `No recipes found containing at least ${minMatchCount} of the specified keyword(s).` });
            }

            res.status(200).json(finalRecipes); // Return the found recipes

        } catch (error) {
            console.error("Error al obtener recetas por palabras del nombre:", error);
            res.status(500).json({ message: 'Error interno del servidor al obtener las recetas.', error: error.message });
        }
    }
);


// Endpoint para eliminar una receta de la base de datos por su nombre (único)
/*
router.delete(
    '/recipes/by-name/:title',
    checkSchema(deleteRecipeByNameValidationSchema),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const { title } = matchedData(req); // Obtener el title validado

            // Buscar la receta por su nombre
            const recipe = await Recipe.findOne({ where: { title } });

            if (!recipe) {
                return res.status(404).json({ message: 'Receta no encontrada con el nombre proporcionado.' });
            }

            // Eliminar la receta
            await recipe.destroy();

            res.status(200).json({ message: 'Receta eliminada exitosamente.' });
            // Alternativamente, para no devolver contenido: res.status(204).send();

        } catch (error) {
            console.error("Error al eliminar la receta por nombre:", error);
            res.status(500).json({ message: 'Error interno del servidor al eliminar la receta.', error: error.message });
        }
    }
);
*/
// Endpoint para verificar la recepción de solicitudes del frontend
router.get('/ping', (req, res) => {
    console.log('Solicitud PING recibida del frontend');
    res.status(200).json({ message: 'Backend activo y respondiendo' });
});

export default router;