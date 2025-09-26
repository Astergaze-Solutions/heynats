FROM alpine:3.22.1
WORKDIR /app
COPY ./bin .
CMD /app/server