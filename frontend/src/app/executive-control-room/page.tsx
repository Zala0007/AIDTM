import type { Metadata } from 'next';
import ExecutiveControlRoomInteractive from './components/ExecutiveControlRoomInteractive';

export const metadata: Metadata = {
  title: 'Executive Control Room - ClinkerFlow',
  description:
    'Monitor critical metrics, alerts, and network status in a consolidated executive control room view.',
};

export default function ExecutiveControlRoomPage() {
  return <ExecutiveControlRoomInteractive />;
}
