import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CombinedOrderEvent } from '../app/orders/actions/pull-orders-from-supabase';

interface EmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderEvent?: CombinedOrderEvent | null;
}

export default function EmailModal({ isOpen, onClose, orderEvent }: EmailModalProps) {
  const [emailForm, setEmailForm] = useState({
    receiver: '',
    subject: '',
    message: '',
    attachment: null as File | null
  });

  const [isSending, setIsSending] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEmailForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setEmailForm(prev => ({
      ...prev,
      attachment: file
    }));
  };

  const handleSend = async () => {
    setIsSending(true);
    
    try {
      // Create FormData for the API request
      const formData = new FormData();
      formData.append('receiver', emailForm.receiver);
      formData.append('subject', emailForm.subject);
      formData.append('message', emailForm.message);
      
      if (emailForm.attachment) {
        formData.append('attachment', emailForm.attachment);
      }
      
      console.log('📧 Sending email request...');
      
      // Send to our API route
      const response = await fetch('/api/send-email', {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
      
      if (response.ok) {
        console.log('✅ Email sent successfully:', result);
        alert(`Email sent successfully! Message ID: ${result.messageId}`);
        
        // Reset form and close modal
        setEmailForm({
          receiver: '',
          subject: '',
          message: '',
          attachment: null
        });
        onClose();
      } else {
        console.error('❌ Failed to send email:', result);
        alert(`Failed to send email: ${result.error}`);
      }
    } catch (error) {
      console.error('❌ Error sending email:', error);
      alert('Failed to send email. Please check your connection and try again.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Send Email</DialogTitle>
          {orderEvent && (
            <p className="text-sm text-gray-500">
              Order ID: {orderEvent.id}
            </p>
          )}
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Receiver */}
          <div className="space-y-2">
            <Label htmlFor="receiver">To</Label>
            <Input
              id="receiver"
              name="receiver"
              type="email"
              value={emailForm.receiver}
              onChange={handleInputChange}
              placeholder="recipient@example.com"
              disabled={isSending}
            />
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              name="subject"
              value={emailForm.subject}
              onChange={handleInputChange}
              placeholder="Email subject"
              disabled={isSending}
            />
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <textarea
              id="message"
              name="message"
              value={emailForm.message}
              onChange={handleInputChange}
              placeholder="Your message here..."
              className="w-full min-h-[120px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              disabled={isSending}
            />
          </div>

          {/* Attachment */}
          <div className="space-y-2">
            <Label htmlFor="attachment">Attachment (PNG only)</Label>
            <Input
              id="attachment"
              type="file"
              accept=".png"
              onChange={handleFileChange}
              disabled={isSending}
              className="cursor-pointer"
            />
            {emailForm.attachment && (
              <p className="text-sm text-gray-600">
                Selected: {emailForm.attachment.name}
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={isSending || !emailForm.receiver || !emailForm.subject}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSending ? 'Sending...' : 'Send Email'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 