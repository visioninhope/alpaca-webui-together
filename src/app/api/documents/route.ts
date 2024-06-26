import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { db } from '@/db/db';
import { files } from '@/db/schema';

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get('file');

  if (!file || !(file instanceof File)) {
    return new NextResponse('No file uploaded', { status: 400 });
  }

  const fileBuffer = await file.arrayBuffer();
  const filePath = `./uploads/${file.name}`;

  await fs.writeFile(filePath, Buffer.from(fileBuffer));

  await db.insert(files).values({ filename: file.name, fileSize: file.size });

  const readableStream = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(fileBuffer));
      controller.close();
    },
  });

  return new Response(readableStream);
}
