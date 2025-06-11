# Use a valid Node.js base image that supports arm64
FROM node:18.20.6-alpine3.21 AS builder

WORKDIR /app

COPY . .

RUN yarn install --force

RUN yarn build

FROM node:18.20.6-alpine3.21

WORKDIR /app

COPY --from=builder /app/dist /app/dist
COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/nest-cli.json /app/nest-cli.json
COPY --from=builder /app/yarn.lock /app/yarn.lock

RUN yarn install --force --frozen-lockfile

CMD ["node", "dist/main"]