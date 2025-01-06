import React from "react";
import { hashPassword, verifyPassword } from "../../utils/auth";
import { generateAccessToken, generateRefreshToken, verifyToken } from "../../utils/jwt";

let testUser = {
  id: "userId",
  email: "test@email.com",
  password: "test",
};

let hashedPassword = await hashPassword(testUser.password);

console.log(`hashed password: ${hashedPassword}`);

let passwordMatch = await verifyPassword(testUser.password, hashedPassword);

console.log(`password verification: ${passwordMatch}`);

// jwt testing

let accessToken = generateAccessToken(testUser);
console.log(`access token: ${accessToken}`);
let refreshToken = generateRefreshToken(testUser);
console.log(`refresh token: ${refreshToken}`);

let verifyAccessToken = verifyToken(accessToken);
console.log(`verifying access token: ${verifyAccessToken}`);

function page() {
  return <div>page</div>;
}

export default page;
