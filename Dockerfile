# Use official Node.js image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY ./ExpressApp/package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the app files
COPY ./ExpressApp .

# Compile TypeScript
RUN npx tsc

# Expose the port your app runs on
EXPOSE 3000

# Start the app from compiled JS
CMD ["node", "--inspect=0.0.0.0:9229", "dist/index.js"]
