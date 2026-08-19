FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Run typescript build
RUN npm run build

EXPOSE 5001

CMD ["npm", "start"]
