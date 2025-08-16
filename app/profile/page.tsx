import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import ProfileView from './ProfileView';

interface UserDocument {
  _id: any;
  email: string;
  name: string;
  bio?: string;
  emailVerified: Date | null;
  createdAt: Date;
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

  const userData = {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    bio: user.bio || '',
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
  };

  return <ProfileView user={userData} />;
}