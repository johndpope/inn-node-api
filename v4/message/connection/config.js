let config = {
    connectionLimit : 1000,
    connectTimeout  : 60 * 60 * 1000,
    acquireTimeout  : 60 * 60 * 1000,
    timeout         : 60 * 60 * 1000,
    host    : 'ec2-34-227-160-194.compute-1.amazonaws.com',
    user    : 'inn_usr',
    password: 'cCUyzADjS5QPHVVt59w46NqSdVFrepM9',
    database: 'inn_db',
    port    :'3306'
};

module.exports = config;