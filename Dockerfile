# Use official Node.js image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY ./ExpressApp/package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the app files
COPY ../ExpressApp/ .

# Expose the port your app runs on
EXPOSE 3000

# Command to run the app
CMD ["node", "index.js"]
