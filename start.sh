#!/bin/bash
echo "Stoping pm2 app"
pm2 stop app
echo "Stoping pm2 server"
pm2 stop server
echo "Installing npm dependencies"
npm install
echo "Starting pm2 app"
pm2 start app
echo "Starting pm2 server"
pm2 start server
