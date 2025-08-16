import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Post from '@/models/Post';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const post = await Post.findById(id);
    
    if (!post) {
      return NextResponse.json({ success: false, error: 'Post not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, data: post });
  } catch (error) {
    console.error('Failed to fetch post:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch post' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await request.json();
    
    if (!body.content) {
      return NextResponse.json({ success: false, error: '投稿内容は必須です' }, { status: 400 });
    }
    
    if (body.content.length > 200) {
      return NextResponse.json({ success: false, error: '投稿は200文字以内にしてください' }, { status: 400 });
    }
    
    const post = await Post.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    });
    
    if (!post) {
      return NextResponse.json({ success: false, error: 'Post not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, data: post });
  } catch (error) {
    console.error('Failed to update post:', error);
    return NextResponse.json({ success: false, error: 'Failed to update post' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const deletedPost = await Post.findByIdAndDelete(id);
    
    if (!deletedPost) {
      return NextResponse.json({ success: false, error: 'Post not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, data: {} });
  } catch (error) {
    console.error('Failed to delete post:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete post' }, { status: 500 });
  }
}