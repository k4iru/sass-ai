Deployment Notes

pm2 to auto start
* after build copy the .next + public folders to var/www/chat.kylecheung.ca
* potentially move git repo to /var/www folder to skip on having to keep copying 
* run websocket server with pm2 start npx --name websocket -- tsx server/server.ts


# TODO

## General
* fix styling so that all page declarations are the same arrow functions i.e. const Home = () => {} export default Home;
* overhaul authentication
* switch to npm-run-all from concurrently
* update langchain logic
* preload messages for faster ui

## websocket
* heartbeat/ping implementation to detect dropped connections
* support multiple clients
* auth check
* error handling
* refactor pushMessage to send through websocket instead of http
* implement reconnect logic
* implement backoff retry 

## chat
* make question asking async so users can't send messages while ai is processing
* think of something to use for key prop