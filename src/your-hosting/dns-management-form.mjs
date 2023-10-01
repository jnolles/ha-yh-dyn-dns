import { parse } from 'node-html-parser';
import { FormData } from 'formdata-node';

import CreateLogger from '../util/log.mjs';

const logger = CreateLogger('yh-dns-form');

export class DnsManagementForm {
  #dnsFormFields = [];

  constructor(htmlPageContents) {
    this.#dnsFormFields = this.#getDnsFormFields(htmlPageContents);
  }

  toKeyValue() {
    return this.#dnsFormFields.reduce((data, field) => {
      data[field.field] = field.value;
      return data;
    }, {} );
  }
  
  toFormData() { // unused atm
    const form = new FormData();
    for (const field of this.#dnsFormFields) {
      form.append(field.field, field.value)
    }
    return form;
  }

  #getDnsFormFields(contents) {
    logger('Parsing DNS page ...');
    const parseName = (name) => {
      const [field, fieldType, fieldNumber, fieldName] = name.match(/(.*)\[(.*)\]\[(.*)\]/)
      return { field, fieldType, fieldNumber, fieldName };
    };
  
    const dnsPageRoot = parse(contents);
  
    const fields = [];
  
    for (const selectElement of dnsPageRoot.querySelectorAll('.dns-editing select')) {
      const name = selectElement.getAttribute('name');
      const selectedOptionElement = selectElement.querySelector('option[selected]');
      const value = selectedOptionElement.getAttribute('value') ?? selectedOptionElement.textContent;
  
      fields.push({
        value,
        ...parseName(name)
      });
    }
  
    for (const inputElement of dnsPageRoot.querySelectorAll('.dns-editing input')) {
      const name = inputElement.getAttribute('name');
      const value = inputElement.getAttribute('value') ?? '';
  
      fields.push({
        value,
        ...parseName(name)
      });
    }
  
    return fields;
  }


  #findRecordByTypeAndName(type, name) {
    const recordNumbersOfType = this.#dnsFormFields.filter(f => f.fieldName === 'type' && f.value === type).map(f => f.fieldNumber);

    const subdomainFieldNumber = recordNumbersOfType.find(fieldNumber => this.#dnsFormFields.find(f => f.field === `record[${fieldNumber}][name]`).value === name)
    if (!subdomainFieldNumber) {
      throw new Error(`Subdomain ${subdomain} with type ${type} not found in form fields`);
    }

    return this.#dnsFormFields.find(f => f.field === `record[${subdomainFieldNumber}][content]`)
  }

  getRecordContent(type, name) {
    return this.#findRecordByTypeAndName(type, name)?.value;
  }

  updateRecordContent(type, name, content) {
    const record = this.#findRecordByTypeAndName(type, name);
    record.value = content;
  }
}
