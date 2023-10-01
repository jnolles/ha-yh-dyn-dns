import got from 'got';
import * as dns from 'node:dns';

import { YourHostingClient } from './your-hosting/your-hosting-client.mjs';
import CreateLogger from './util/log.mjs';

const logger = CreateLogger('main');

for (const requiredVar of ['DOMAIN', 'SUBDOMAINS', 'YH_IDENTITY', 'YH_PASSWORD', 'DNS']) {
  if (!process.env[requiredVar]) {
    throw new Error(requiredVar + ' env var not set');
  }
}

const domain = process.env.DOMAIN;
const subdomains = process.env.SUBDOMAINS?.split(',');

const credentials = {
  identity: process.env.YH_IDENTITY,
  password: process.env.YH_PASSWORD,
  twoFactor: null
};

dns.promises.setServers([process.env.DNS]);

async function main() {

  const currentIpData = await got.get('https://api.ipify.org?format=json').json();

  if (!currentIpData.ip) {
    throw new Error('Unexpected response from api.ipify.org: ' + JSON.stringify(currentIpData));
  }

  logger('Current ip is ' + currentIpData.ip + ', checking subdomains: ' + subdomains.join(', '))

  let ipHasChanged = false;
  
  for (const subdomain of subdomains) {
    const currentDNSIP = (await dns.promises.resolve(`${subdomain}.${domain}`)).at(0);
    
    if (currentDNSIP !== currentIpData.ip) {
      logger(`Domain ${subdomain} has ip ${currentDNSIP} in DNS`)
      logger('> ip has changed!')
      ipHasChanged = true;
    }
  }

  if (!ipHasChanged) {
    logger('No ip changes');
    return;
  }

  const yourHosting = new YourHostingClient();

  await yourHosting.login(credentials);

  const dnsSettings = await yourHosting.getDnsSettings(domain);
  
  let ipConfigMustChange = false;

  for (const subdomain of subdomains) {
    const dnsRecordValue = dnsSettings.getRecordContent('A', subdomain);

    logger(`Domain ${subdomain} has ip ${dnsRecordValue} in YourHosting config`);

    if (dnsRecordValue !== currentIpData.ip) {
      logger('> ip must change!');
      dnsSettings.updateRecordContent('A', subdomain, currentIpData.ip);
      ipConfigMustChange = true;
    }
  }

  if (!ipConfigMustChange) {
    logger('Config is up-to-date, no change to make');
    return;
  }

  await yourHosting.updateDnsSettings(domain, dnsSettings);
}

const runInterval = parseInt(process.env.INTERVAL);

if (runInterval) {
  logger(`Running every ${runInterval} seconds`);
}

const run = () => main().then(() => {
  if (runInterval) {
    setTimeout(run, runInterval * 1000)
  }
});

run();

