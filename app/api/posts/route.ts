import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Post from '@/models/Post';

export async function GET() {
  try {
    console.log('Connecting to MongoDB...');
    await dbConnect();
    console.log('Connected to MongoDB successfully');
    
    const posts = await Post.find({}).sort({ createdAt: -1 });
    console.log(`Found ${posts.length} posts`);
    
    return NextResponse.json({ success: true, data: posts });
  } catch (error) {
    console.error('Detailed error in GET /api/posts:', error);
    
    // 詳細なエラー情報を返す（本番環境でも一時的にデバッグ用）
    const errorDetails = {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      env: process.env.VERCEL ? 'vercel' : 'local',
      mongoUri: process.env.MONGODB_URI ? 'SET' : 'NOT_SET'
    };
    
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch posts',
      debug: errorDetails
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('POST /api/posts - Connecting to MongoDB...');
    await dbConnect();
    
    const body = await request.json();
    console.log('Received body:', body);
    
    if (!body.content) {
      return NextResponse.json({ success: false, error: '投稿内容は必須です' }, { status: 400 });
    }
    
    if (body.content.length > 200) {
      return NextResponse.json({ success: false, error: '投稿は200文字以内にしてください' }, { status: 400 });
    }
    
    const post = await Post.create({ content: body.content });
    console.log('Created post:', post);
    
    return NextResponse.json({ success: true, data: post }, { status: 201 });
  } catch (error) {
    console.error('Detailed error in POST /api/posts:', error);
    
    // 詳細なエラー情報を返す（本番環境でも一時的にデバッグ用）
    const errorDetails = {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      env: process.env.VERCEL ? 'vercel' : 'local',
      mongoUri: process.env.MONGODB_URI ? 'SET' : 'NOT_SET'
    };
    
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to create post',
      debug: errorDetails
    }, { status: 500 });
  }
}