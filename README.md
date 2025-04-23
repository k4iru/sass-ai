Deployment Notes

pm2 to auto start
* after build copy the .next + public folders to var/www/chat.kylecheung.ca
* potentially move git repo to /var/www folder to skip on having to keep copying 
* run websocket server with pm2 start npx --name websocket -- tsx server/server.ts
