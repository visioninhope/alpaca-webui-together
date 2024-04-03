import React, { FC, useState } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { DoubleArrowUpIcon, StopIcon } from '@radix-ui/react-icons';

interface ChatInputProps {
  // eslint-disable-next-line no-unused-vars
  onSendInput: (input: string) => Promise<void>;
  onCancelStream: () => void;
  chatInputPlaceholder: string;
  isStreamProcessing: boolean;
  isFetchLoading: boolean;
  isLlmModelActive: boolean;
}

export const ChatInput: FC<ChatInputProps> = ({
  onSendInput,
  onCancelStream,
  chatInputPlaceholder,
  isStreamProcessing,
  isFetchLoading,
  isLlmModelActive,
}) => {
  const [chatInput, setChatInput] = useState<string>('');

  const sendChat = async () => {
    const chatInputTrimmed = chatInput.trim();
    setChatInput('');
    await onSendInput(chatInputTrimmed);
  };

  const chatEnterPress = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isStreamProcessing && !isFetchLoading && isLlmModelActive) {
      await sendChat();
    }
  };

  const preventEnterPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isStreamProcessing && !isFetchLoading && isLlmModelActive) {
      e.preventDefault();
    }
  };

  return (
    <>
      <Textarea
        value={chatInput}
        onChange={(e) => setChatInput(e.target.value)}
        onKeyUp={chatEnterPress}
        onKeyDown={preventEnterPress}
        placeholder={chatInputPlaceholder}
        className="overflow-hidden pr-20"
        disabled={!isLlmModelActive}
      />
      {isStreamProcessing ? (
        <Button
          onClick={onCancelStream}
          variant="secondary"
          size="icon"
          className="absolute bottom-6 right-3"
          disabled={isFetchLoading}
        >
          <StopIcon className="h-4 w-4" />
        </Button>
      ) : (
        <Button
          onClick={sendChat}
          variant="secondary"
          size="icon"
          className="absolute bottom-6 right-3"
          disabled={isStreamProcessing || isFetchLoading || !isLlmModelActive}
        >
          <DoubleArrowUpIcon className="h-4 w-4" />
        </Button>
      )}
    </>
  );
};
