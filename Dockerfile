FROM alpine:3.22.1
WORKDIR /app
COPY ./bin .
COPY ./client/dist ./client/dist
CMD ["/app/server"]