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
   host: "ec2-54-242-108-13.compute-1.amazonaws.com",
   key: "~/.ssh/kp-nuvoli-inngage.pem",
   ref: "origin/master",
   repo: "https://inn-node-api-user:!@#123Mudar@bitbucket.org/inngage/inn-node-api.git",
   path: "/home/ubuntu/app/inn-node-api",
   "post-deploy":
      "npm install && pm2 startOrRestart ecosystem.config.js"
  }
 }
};
