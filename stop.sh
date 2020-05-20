#!/bin/bash
echo "Stoping pm2 app"
pm2 stop app
echo "Stoping pm2 server"
pm2 stop server
