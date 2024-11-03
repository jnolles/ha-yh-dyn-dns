import got from 'got';
import { CookieJar } from 'tough-cookie';

import { DnsManagementForm } from './dns-management-form.mjs'

import CreateLogger from '../util/log.mjs';

const logger = CreateLogger('yh-client');

export class YourHostingClient {
  #cookieJar;

  async login(identifier, password) {
    const credentials = {
      identifier,
      password,
      method: 'password'
    };

    this.#cookieJar = new CookieJar();

    logger('Request login url ...');
    const preLoginResponse = await got.get('https://id.account.yourhosting.nl/self-service/login/browser', { cookieJar: this.#cookieJar }).json();

    const loginUrl = preLoginResponse.ui.action;
    const csrfTokenAttributeValue = preLoginResponse.ui.nodes.find(node => node.attributes.name === 'csrf_token').attributes.value;
    credentials.csrf_token = csrfTokenAttributeValue;
  
    logger('POST credentials ...');
    const loginResponse = await got.post(loginUrl, { json: credentials, cookieJar: this.#cookieJar }).json();
    
    if (!loginResponse.session.id) {
      throw new Error('Login failed, expected an session: ' + JSON.stringify(loginResponse.data, null, 2))
    }

    // Ask for redirect url
    logger('Request SSO redirect to portal ...');
    const ssoResponse = await got.post('https://sso.account.yourhosting.nl/sso', { json: { slug: "yourhosting", targetApplication:"customerPanel"},  cookieJar: this.#cookieJar }).json();
    
    if (!ssoResponse.redirect_url) {
      throw new Error('SSO redirect failed, expected a redirect url: ' + JSON.stringify(ssoResponse.body, null, 2))
    }
    
    // follow redirect uri to create session cookie
    logger('Redirecting to ' + ssoResponse.redirect_url);
    await got.get(ssoResponse.redirect_url, { cookieJar: this.#cookieJar });
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
    logger('> DONE!');
  }
}
