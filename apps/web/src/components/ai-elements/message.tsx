import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { UIMessage } from 'ai';
import type { ComponentProps, HTMLAttributes } from 'react';

export type MessageProps = HTMLAttributes<HTMLDivElement> & {
  from: UIMessage['role'];
};

export const Message = ({ className, from, ...props }: MessageProps) => (
  <div
    className={cn(
      'group flex w-full items-end gap-2 py-4',
      from === 'user' ? 'is-user justify-end' : 'is-assistant justify-start',
      '[&>div]:max-w-[80%]',
      className
    )}
    {...props}
  />
);

export type MessageContentProps = HTMLAttributes<HTMLDivElement>;

export const MessageContent = ({
  children,
  className,
  ...props
}: MessageContentProps) => (
  <div
    className={cn(
      'flex flex-col gap-2 overflow-hidden rounded-lg px-4 py-3 text-sm',
      'group-[.is-user]:bg-gray-800 group-[.is-user]:text-white dark:group-[.is-user]:bg-gray-700 dark:group-[.is-user]:text-white',
      'group-[.is-assistant]:bg-gray-100 group-[.is-assistant]:text-gray-800 dark:group-[.is-assistant]:bg-gray-800 dark:group-[.is-assistant]:text-gray-200',
      className
    )}
    {...props}
  >
    <div>{children}</div>
  </div>
);
