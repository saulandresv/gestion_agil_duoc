-- Add requesting_id field to movements table
-- This represents the person who requested/solicited the movement

ALTER TABLE movements 
ADD COLUMN requesting_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- Add comment for clarity
COMMENT ON COLUMN movements.requesting_id IS 'ID of the user who requested/solicited this movement';