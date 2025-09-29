Deployment Notes

pm2 to auto start
* after build copy the .next + public folders to var/www/chat.kylecheung.ca
* potentially move git repo to /var/www folder to skip on having to keep copying build files
* run websocket server with pm2 start npx --name websocket -- tsx server/server.ts



# TODO

## General
* fix styling so that all page declarations are the same arrow functions i.e. const Home = () => {} export default Home;
* overhaul authentication
* switch to npm-run-all from concurrently
* update langchain logic
* preload messages for faster ui
* redis caching
* automate deployment
* implement an actual logger

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
* refactor chatlistitem into separate sub components for maintainability
* optimistic ui. on new chat push message to list immediately while waiting for reply. don't need to wait until message in db to sync
* move message push to db until after api response to get exact token size
* after deleting chat, redirect chat page
* debounce sends

## auth
* rework auth logic so that users aren't logged out after 15 minutes of no activity
* on login userid isn't defined until refresh
* add salt
* fix ability to send messages with expired tokens.
* on new user creation. validate they have valid api key or only let user use limited features.
* email validation, free trial etc

## Tests
* Implement some test classes

# Lessons
* uuids even though slightly slower to generate than auto incrementing integers, helps speed things overall for optimistic ui since I don't need to wait for database insert