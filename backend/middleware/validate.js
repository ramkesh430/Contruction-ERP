export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(422).json({ message: 'Validation failed', errors: result.error.flatten() });
  }
  req.validatedBody = result.data;
  next();
};
