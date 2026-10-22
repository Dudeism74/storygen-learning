# Use a supported Node.js LTS runtime.
FROM node:22-alpine

# Set the working directory in the container
WORKDIR /app

# Install the exact reviewed dependency lockfile.
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# Copy the rest of the application code
COPY . .

# Accept build argument for backend URL
ARG NEXT_PUBLIC_BACKEND_URL

# Set the environment variable for build
ENV NEXT_PUBLIC_BACKEND_URL=${NEXT_PUBLIC_BACKEND_URL}

# Build the Next.js application
RUN npm run build

# Expose port 3000
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
