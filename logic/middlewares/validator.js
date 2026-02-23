const { z } = require('zod');

// Middleware to parse and validate request bodies against a Zod schema
const validateBody = (schema) => {
    return (req, res, next) => {
        try {
            // Parse and safely map the result to req.body, stripping unexpected fields (if schema allows)
            req.body = schema.parse(req.body);
            next();
        } catch (error) {
            if (error instanceof z.ZodError) {
                // Map Zod errors to a clear format
                const errorMessages = error.errors.map((err) => ({
                    field: err.path.join('.'),
                    message: err.message,
                }));

                return res.status(400).json({
                    message: "Validation Error",
                    errors: errorMessages
                });
            }
            next(error);
        }
    };
};

module.exports = { validateBody };
