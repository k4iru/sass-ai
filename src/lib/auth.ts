import bcrypt from "bcrypt";

// Hash password
export async function hashPassword(password: string): Promise<string> {
  try {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    return hashedPassword;
  } catch (err) {
    throw new Error("Error hashing password: " + (err instanceof Error ? err.message : "Unknown error"));
  }
}

// Compare password
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  try {
    const isMatch = await bcrypt.compare(password, hashedPassword);
    return isMatch;
  } catch (err) {
    throw new Error("Error comparing password: " + (err instanceof Error ? err.message : "Unknown error"));
  }
}
