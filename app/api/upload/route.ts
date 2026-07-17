import { v2 as cloudinary } from 'cloudinary';
import { type NextRequest, NextResponse } from 'next/server';

// Configuration for server-side upload
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;
    const folder = formData.get('folder') as string || 'documents';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Cloudinary buffer streaming
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadResponse = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `bts_portal/${folder}/${userId || 'anonymous'}`,
          resource_type: 'auto',
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(buffer);
    }) as any;

    return NextResponse.json({
      success: true,
      url: uploadResponse.secure_url,
      filename: file.name,
      size: file.size,
    });

  } catch (error: any) {
    console.error('Cloudinary Server Error:', error);
    return NextResponse.json(
      { error: 'Server upload failed', details: error.message },
      { status: 500 }
    );
  }
}