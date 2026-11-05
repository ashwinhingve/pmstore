'use client';

import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/store/useToastStore';

/**
 * Admin-only "send me a test" button for the WhatsApp new-order alert. Lets the
 * owner confirm, from the Orders page, that CallMeBot delivery actually reaches
 * the store phone — the real confirmation is the message arriving on WhatsApp.
 */
export default function TestWhatsAppButton() {
  const [sending, setSending] = useState(false);

  const handleTest = async () => {
    setSending(true);
    try {
      const res = await fetch('/api/admin/notifications/test-whatsapp', { method: 'POST' });

      if (res.status === 429) {
        toast.error('Too many test sends. Wait a few minutes and try again.');
        return;
      }

      const data = await res.json().catch(() => ({}));

      if (data?.ok) {
        toast.success('Test alert sent. Check WhatsApp on your store phone.');
      } else if (data?.reason === 'not_configured') {
        toast.info('WhatsApp alerts aren’t switched on yet. Add the CallMeBot API key first.');
      } else {
        toast.error('Couldn’t send the test alert. Check the API key and try again.');
      }
    } catch {
      toast.error('Couldn’t send the test alert. Try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={handleTest}
      loading={sending}
    >
      <MessageCircle aria-hidden="true" />
      {sending ? 'Sending…' : 'Send test WhatsApp alert'}
    </Button>
  );
}
