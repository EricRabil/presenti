import { ErrorResponse } from "./types";

const STATUS_CODES = {
    '100': 'Continue',
    '101': 'Switching Protocols',
    '102': 'Processing',
    '103': 'Early Hints',
    '200': 'OK',
    '201': 'Created',
    '202': 'Accepted',
    '203': 'Non-Authoritative Information',
    '204': 'No Content',
    '205': 'Reset Content',
    '206': 'Partial Content',
    '207': 'Multi-Status',
    '208': 'Already Reported',
    '226': 'IM Used',
    '300': 'Multiple Choices',
    '301': 'Moved Permanently',
    '302': 'Found',
    '303': 'See Other',
    '304': 'Not Modified',
    '305': 'Use Proxy',
    '307': 'Temporary Redirect',
    '308': 'Permanent Redirect',
    '400': 'Bad Request',
    '401': 'Unauthorized',
    '402': 'Payment Required',
    '403': 'Forbidden',
    '404': 'Not Found',
    '405': 'Method Not Allowed',
    '406': 'Not Acceptable',
    '407': 'Proxy Authentication Required',
    '408': 'Request Timeout',
    '409': 'Conflict',
    '410': 'Gone',
    '411': 'Length Required',
    '412': 'Precondition Failed',
    '413': 'Payload Too Large',
    '414': 'URI Too Long',
    '415': 'Unsupported Media Type',
    '416': 'Range Not Satisfiable',
    '417': 'Expectation Failed',
    '418': "I'm a Teapot",
    '421': 'Misdirected Request',
    '422': 'Unprocessable Entity',
    '423': 'Locked',
    '424': 'Failed Dependency',
    '425': 'Too Early',
    '426': 'Upgrade Required',
    '428': 'Precondition Required',
    '429': 'Too Many Requests',
    '431': 'Request Header Fields Too Large',
    '451': 'Unavailable For Legal Reasons',
    '500': 'Internal Server Error',
    '501': 'Not Implemented',
    '502': 'Bad Gateway',
    '503': 'Service Unavailable',
    '504': 'Gateway Timeout',
    '505': 'HTTP Version Not Supported',
    '506': 'Variant Also Negotiates',
    '507': 'Insufficient Storage',
    '508': 'Loop Detected',
    '509': 'Bandwidth Limit Exceeded',
    '510': 'Not Extended',
    '511': 'Network Authentication Required'
}

/**
 * Structure for API-related errors, to be serialized/handled in whatever context needed
 */
export class APIError {
    protected _data: any;
    constructor(public message: string, public code: number = 400, public items: Record<string, string[]> = {}) { }

    public static from({ error, code, fields, data }: ErrorResponse): APIError {
        return new APIError(error, code, fields).data(data);
    }

    public fields(fields: Record<string, string[]>) {
        this.items = Object.assign({}, this.items, fields);
        return this;
    }

    public data(data: any): this {
        this._data = data;
        return this;
    }

    public get json(): ErrorResponse {
        return {
            error: this.message,
            code: this.code,
            fields: Object.keys(this.items).length > 0 ? this.items : undefined,
            data: this._data
        }
    }

    public get httpCode() {
        const httpMessage = (STATUS_CODES as any)[this.code];
        if (!httpMessage) return this.code.toString();
        return `${this.code} ${httpMessage}`;
    }

    public static notFound(message: string = "Unknown resource.") {
        return new APIError(message, 404);
    }

    public static badRequest(message: string = "Bad request.") {
        return new APIError(message, 400);
    }

    public static internal(message: string = "Internal error.") {
        return new APIError(message, 500);
    }

    public static timeout(message: string = "Service timeout.") {
        return new APIError(message, 502);
    }

    public static unauthorized(message: string = "Unauthorized.") {
        return new APIError(message, 401);
    }

    public static forbidden(message: string = "Forbidden.") {
        return new APIError(message, 403);
    }
}