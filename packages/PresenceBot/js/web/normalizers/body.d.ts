/**
 * Source: https://raw.githubusercontent.com/nanoexpress/nanoexpress/master/src/normalizers/body.js
 */
import { PBRequest, PBResponse } from '../types';
export default function BodyNormalizer(req: PBRequest, res: PBResponse): Promise<string | undefined>;
