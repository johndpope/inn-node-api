module.exports = {
 apps: [
  {
   name: "inn-node-api",
   script: "./app.js",
   env: {
    PORT: 3000,
    NODE_ENV: "production"
   }
  }
 ],
 deploy: {
  production: {
   user: "ubuntu",
   host: "ec2-3-82-12-16.compute-1.amazonaws.com",
   key: "~/.ssh/kp-nuvoli-inngage.pem",
   ref: "origin/master",
   repo: "https://viniciusdepaula:v1n1c1us@bitbucket.org/inngage/inn-node-api.git",
   path: "/home/ubuntu/app/inn-node-api",
   "post-deploy":
    "npm install && pm2 startOrRestart ecosystem.config.js"
  }
 }
};
