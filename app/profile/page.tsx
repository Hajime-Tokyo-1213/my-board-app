import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Follow from '@/models/Follow';
import ProfileView from './ProfileView';

interface UserDocument {
  _id: any;
  email: string;
  name: string;
  bio?: string;
  emailVerified: Date | null;
  createdAt: Date;
  followingCount?: number;
  followersCount?: number;
}

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    redirect('/auth/signin');
  }

  await dbConnect();
  
  const user = await User.findOne({ email: session.user.email })
    .select('-password -verificationToken -resetPasswordToken -resetPasswordExpires')
    .lean() as UserDocument | null;

  if (!user) {
    redirect('/auth/signin');
  }

  // フォロー数とフォロワー数をカウント
  const [followingCount, followersCount] = await Promise.all([
    user.followingCount ?? Follow.countDocuments({ followerId: user._id }),
    user.followersCount ?? Follow.countDocuments({ followingId: user._id })
  ]);

  const userData = {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    bio: user.bio || '',
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
    followingCount,
    followersCount,
  };

  return <ProfileView user={userData} />;
}