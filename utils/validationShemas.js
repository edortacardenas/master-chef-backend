
export const createRecipeValidationShema = {
    title: {
        in: ['body'], // Especifica que el campo está en el cuerpo de la solicitud
        exists: {
            errorMessage: "Recipe name is required",
            options: { checkFalsy: true } // Asegura que no sea una cadena vacía, null, undefined, etc.
        },
        isString: {
            errorMessage: "Recipe name must be a string"
        },
        isLength: {
            options: { min: 3, max: 100 },
            errorMessage: "Recipe name must be between 3 and 100 characters",
        },
        trim: true // Elimina espacios en blanco al principio y al final
    },
    ingredients: {
        in: ['body'],
        exists: {
            errorMessage: "Ingredients are required"
        },
        isArray: {
            options: { min: 1 }, // Debe ser un array con al menos un ingrediente
            errorMessage: "Ingredients must be an array with at least one item."
        },
        custom: {
            options: (value) => {
                if (!Array.isArray(value)) return false; // Ya cubierto por isArray, pero por seguridad
                // The `isArray` check is already handled by the validator chain, making this line redundant.
                return value.every(item => typeof item === 'string' && item.trim().length > 0);
            },
            errorMessage: "All ingredients must be non-empty strings."
        }
    },
    instructions: {
        in: ['body'],
        exists: { errorMessage: "instructions is required", options: { checkFalsy: true } },
        isString: { errorMessage: "instructions must be a string" },
        isLength: { options: { min: 10 }, errorMessage: "instructions must be at least 10 characters long" },
        trim: true
    },
};

export const chatCompletionValidationSchema = {
    ingredientsString: {
        in: ['body'],
        exists: {
            errorMessage: "ingredientsString is required",
            options: { checkFalsy: true }
        },
        isString: {
            errorMessage: "ingredientsString must be a string"
        },
        notEmpty: {
            errorMessage: "ingredientsString cannot be empty"
        },
        trim: true
    }
};

/*
export const deleteRecipeByNameValidationSchema = {
    title: {
        in: ['params'], // El nombre de la receta vendrá como parámetro en la URL
        exists: {
            errorMessage: "Recipe name is required in URL parameters",
            options: { checkFalsy: true }
        },
        isString: {
            errorMessage: "Recipe name must be a string"
        },
        notEmpty: {
            errorMessage: "Recipe name cannot be empty"
        }
    }
};
*/

export const getRecipeByNameValidationSchema = {
    title: {
        in: ['params'], // El nombre de la receta vendrá como parámetro en la URL
        exists: {
            errorMessage: "Recipe name is required in URL parameters",
            options: { checkFalsy: true }
        },
        isString: {
            errorMessage: "Recipe name must be a string"
        },
        notEmpty: {
            errorMessage: "Recipe name cannot be empty"
        }
    }
};

export const getRecipesByIngredientsValidationSchema = {
    ingredients: {
        in: ['query'],
        notEmpty: {
            errorMessage: 'Ingredients query parameter cannot be empty.',
        },
        isString: {
            errorMessage: 'Ingredients must be a comma-separated string.',
        },
        // Sanitize to an array of trimmed, lowercased, non-empty strings
        customSanitizer: {
            options: (value) => {
                if (typeof value !== 'string') return [];
                return value.split(',')
                    .map(ing => ing.trim().toLowerCase())
                    .filter(ing => ing.length > 0);
            }
        },
        // Validate the sanitized array
        custom: {
            options: (value) => {
                if (!Array.isArray(value) || value.length === 0) {
                    throw new Error('At least one valid ingredient must be provided.');
                }
                // Ensure all items in the array are non-empty strings after sanitization
                if (value.some(ing => typeof ing !== 'string' || ing.trim() === '')) {
                     throw new Error('All ingredients must be valid non-empty strings after processing.');
                }
                return true;
            },
        },
    },
};