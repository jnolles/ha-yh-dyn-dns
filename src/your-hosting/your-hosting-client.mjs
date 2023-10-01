import got from 'got';
import { CookieJar } from 'tough-cookie';

import { DnsManagementForm } from './dns-management-form.mjs'

import CreateLogger from '../util/log.mjs';

const logger = CreateLogger('yh-client');

export class YourHostingClient {
  #cookieJar;

  async login(credentials) {
    this.#cookieJar = new CookieJar();

    logger('POST credentials ...');
    const loginResponse = await got.post('https://sso.account.yourhosting.nl/login', { json: credentials, cookieJar: this.#cookieJar }).json();

    if (loginResponse.data.length !== 1) {
      throw new Error('Login failed, expected an array: ' + JSON.stringify(loginResponse.data, null, 2))
    }

    const loginData = loginResponse.data.at(0);

    if (!loginData.redirect_url) {
      throw new Error('Login failed, no redirect uri: ' + JSON.stringify(loginResponse.data, null, 2))
    }

    // follow redirect uri to create session cookie
    logger('Follow redirect ...');
    await got.get(loginData.redirect_url, { cookieJar: this.#cookieJar });
  }

  async getDnsSettings(domainName) {
    logger('Download DNS page ...');
    const dnsForm = await got.get(`https://mijn.yourhosting.nl/nl/dns/show_dns_records/${domainName}`, { cookieJar: this.#cookieJar });
    return new DnsManagementForm(dnsForm.body);
  }

  async updateDnsSettings(domainName, dnsManagementForm) {
    logger('Updating DNS settings ...');
    const form = dnsManagementForm.toKeyValue();
    await got.post(`https://mijn.yourhosting.nl/nl/dns/update_dns/${domainName}`, { cookieJar: this.#cookieJar, form });
  }
}
