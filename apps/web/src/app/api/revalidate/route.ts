import { createHash, timingSafeEqual } from 'node:crypto';
import { revalidatePath, revalidateTag } from 'next/cache';
import {
  PUBLIC_SETTINGS_CACHE_TAG,
  REVALIDATE_SECRET_HEADER,
  revalidateRequestSchema,
  type RevalidateResponse,
} from '@under30ss/shared';
import { getWebEnv } from '@/lib/web-env';

// Hashing first gives equal-length buffers, so timingSafeEqual never throws on length mismatch.
const sha256 = (value: string) => createHash('sha256').update(value).digest();

const secretMatches = (provided: string | null, expected: string): boolean =>
  provided !== null && timingSafeEqual(sha256(provided), sha256(expected));

const errorResponse = (status: number, code: string, message: string) =>
  Response.json({ error: { code, message } }, { status });

export async function POST(request: Request): Promise<Response> {
  let expectedSecret: string;
  try {
    expectedSecret = getWebEnv().REVALIDATE_SECRET;
  } catch (error) {
    console.error('revalidate: web environment is invalid', error);
    return errorResponse(500, 'INTERNAL_ERROR', 'Server is not configured');
  }

  if (!secretMatches(request.headers.get(REVALIDATE_SECRET_HEADER), expectedSecret)) {
    return errorResponse(401, 'UNAUTHORIZED', 'Invalid revalidate secret');
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, 'VALIDATION_ERROR', 'Body must be valid JSON');
  }
  const parsed = revalidateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(400, 'VALIDATION_ERROR', 'Body must be { paths: string[] } (each starting with "/") or { scope: "all" }');
  }

  if ('scope' in parsed.data) {
    // Site-wide change (e.g. settings): the root layout covers every page beneath it.
    revalidatePath('/', 'layout');
    revalidateTag(PUBLIC_SETTINGS_CACHE_TAG, { expire: 0 });
    const result: RevalidateResponse = { revalidated: ['/'] };
    return Response.json(result);
  }

  for (const path of parsed.data.paths) revalidatePath(path);
  const result: RevalidateResponse = { revalidated: parsed.data.paths };
  return Response.json(result);
}
