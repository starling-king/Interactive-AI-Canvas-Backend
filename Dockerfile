# 1. Use a lightweight, official Node.js image based on Alpine Linux
FROM node:22-alpine

# 2. Set the environment variable to production
ENV NODE_ENV=production

# 3. Create a working directory inside the container
WORKDIR /app

# 4. Copy ONLY package.json and package-lock.json first
COPY package*.json ./

# 5. Install dependencies cleanly
RUN npm ci --omit=dev

# 6. Copy the rest of your application code
COPY . .

# 7. Security: Run the app as a non-root user
USER node

# 8. Expose the port your Express app runs on (Assuming 8000, change if different)
EXPOSE 8000

# 9. The command to start your application
CMD ["npm", "start"]