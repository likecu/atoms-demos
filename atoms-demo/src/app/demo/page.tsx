import { Metadata } from 'next';
import DemoChatLayout from '@/components/chat/demo-chat-layout';

export const metadata: Metadata = {
    title: 'Atoms Demo - Interactive Example',
    description: 'Experience the AI website building process with this interactive demo.',
};

export default function DemoPage() {
    return <DemoChatLayout />;
}
