"use client"

import { useRouter, useParams } from 'next/navigation'
import ChatWindow from '@/components/Chat';

export default function ChatPage() {
  const { receiverId } = useParams();
  // console.log(receiverId)
  if (!receiverId) return <div>Loading...</div>;

  return <ChatWindow receiverId={parseInt(receiverId as string)} />;
}