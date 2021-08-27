import { BearerSecurity, Client, createClientAsync } from "soap";

export type DFPOptions = {
  networkCode: string;
  apiVersion: string;
};

export interface DFPClient extends Client {
  setToken(token: string): void;
}

export class DFP {
  private readonly options: DFPOptions;

  constructor(options: DFPOptions) {
    this.options = options;
  }

  public async getService(service: string, token?: string): Promise<DFPClient> {
    const { apiVersion } = this.options;
    const serviceUrl = `https://ads.google.com/apis/ads/publisher/${apiVersion}/${service}?wsdl`;
    const client = await createClientAsync(serviceUrl);

    client.addSoapHeader(this.getSoapHeaders());

    client.setToken = function setToken(token: string) {
      client.setSecurity(new BearerSecurity(token));
    };

    if (token) {
      client.setToken(token);
    }

    return new Proxy(client, {
      get: function get(target, propertyKey) {
        const method = propertyKey.toString();
        if (target.hasOwnProperty(method) && !["setToken"].includes(method)) {
          return async function run(dto: any = {}) {
            const [result, ..._] = await client[`${method}Async`](dto);
            return DFP.parse(result);
          };
        } else {
          return target[method];
        }
      },
    }) as DFPClient;
  }

  public static parse(res: any) {
    return res.rval;
  }

  private getSoapHeaders() {
    const { apiVersion, networkCode } = this.options;

    return {
      RequestHeader: {
        attributes: {
          "soapenv:actor": "http://schemas.xmlsoap.org/soap/actor/next",
          "soapenv:mustUnderstand": 0,
          "xsi:type": "ns1:SoapRequestHeader",
          "xmlns:ns1":
            "https://www.google.com/apis/ads/publisher/" + apiVersion,
          "xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
          "xmlns:soapenv": "http://schemas.xmlsoap.org/soap/envelope/",
        },
        "ns1:networkCode": networkCode,
        "ns1:applicationName": "content-api",
      },
    };
  }
}
