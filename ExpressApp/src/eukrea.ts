const { Eureka }: any = require('eureka-js-client');

// Configure Eureka client
const client = new Eureka({
    instance: {
        app: process.env.EUREKA_APP_NAME || "expressjs",
        hostName: `${process.env.HOSTNAME}`,
        ipAddr: "127.0.0.1",
        port: {
            '$': process.env.EXPRESS_PORT,
            '@enabled': 'true',
        },
        vipAddress: process.env.EUREKA_APP_NAME || "expressjs",
        dataCenterInfo: {
            '@class': 'com.netflix.appinfo.InstanceInfo$DefaultDataCenterInfo',
            name: 'MyOwn',
        },
        leaseInfo: {
            renewalIntervalInSecs: 30, // Send heartbeat every 30 seconds
            durationInSecs: 60,
        },
    },
    eureka: {
        host: process.env.EUREKA_HOST,
        port: process.env.EUREKA_PORT,
        servicePath: '/eureka/apps/'
    }
});

export function configureEukera() {
    return new Promise<void>((resolve, reject) => {
        // Start Eureka client
        client.start((error: any) => {
            if (error) {
                console.log('Eureka client started with error:', error);
                reject(error)
            } else {
                console.log('Eureka client started');
                resolve()
            }
        });

        client.on('deregistered', () => {
            console.warn('Instance deregistered from Eureka');
        });

        client.on('heartbeat', () => {
        });

    })
}

export function getServiceUrl(serviceName : any) {
    return new Promise((resolve, reject) => {
        try {
            let instances = client.getInstancesByAppId(serviceName);

            if (instances.length === 0) {
                return reject(new Error('No instances available'));
            }

            const instance = instances[Math.ceil(Math.random() * instances.length) - 1];
            const serviceUrl = `http://${instance.hostName}:${instance.port.$}`;
            resolve(serviceUrl);
        } catch (error) {
            reject(error)
        }
    });
};